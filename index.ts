import { defContext } from '@thi.ng/parse';
import {
    appendFileSync,
    copyFileSync,
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
} from 'fs';
import { AST, Node, NodeField } from './src/api';
import { buildAst } from './src/ast-transforms';
import { importsForFile, effectOnObjectNode, writeSimpleSettersToFile } from './src/file-writers';
import { program } from './src/parser';
import { importStatement, importThingPaths, setFnRoot, initialComment } from './src/templates';

const inputfile = process.argv.length > 2 && process.argv[2];

if (!inputfile) {
    console.error('Need a TypeScript file as first argument')
} else if (!existsSync(inputfile)) {
    console.error(`${inputfile} doesn't exist`);
} else {
    const [ schemaFilename, extension ] = inputfile.split('.');
    const schemaPath = __dirname + '/' + schemaFilename + '.' + extension;
    const buildPath = __dirname + '/build/';

    const schema = readFileSync(schemaPath, 'utf8');
    const ctx = defContext(schema, { debug: false });
    program(ctx);
    const asts: AST[] = buildAst(ctx.result)
    const allInterfaces = asts.reduce((acc, intfc) => {
        return (acc.push(intfc[0].name), acc);
    }, [])

    // copy provided TS schema file
    copyFileSync(schemaPath, buildPath + schemaFilename + '.' + extension)

    const [ rootNode, rest ]: AST = asts[0];
    const rootInterfaceName = rootNode.name;

    // write root index file for operations on entire form
    const rootIndexFilePath = `${buildPath}index.ts`;
    writeFileSync(rootIndexFilePath, initialComment);
    const allImports = [ importThingPaths, importStatement([ rootInterfaceName ], schemaFilename) ];
    appendFileSync(rootIndexFilePath, allImports.join(''));
    appendFileSync(rootIndexFilePath, setFnRoot(rootInterfaceName));

    // generate nested directory sturcture that matches the form object with files for operations on each part
    const onNodeVisit = (basepath: string, directoryLevel = 1) => async (node: Node, children: (Node | NodeField)[]) => {
        const filepath = `${basepath}${node.name}/`;
        const fullpath = `${filepath}/index.ts`;

        (!existsSync(filepath) && mkdirSync(filepath, { recursive: true }))
        writeFileSync(fullpath, initialComment);

        const localImports = [ rootInterfaceName, ...importsForFile(rest, allInterfaces) ];
        const allImports = [ importThingPaths ].concat(importStatement(localImports, schemaFilename, directoryLevel));
        appendFileSync(fullpath, allImports.join(''));

        await writeSimpleSettersToFile(children, fullpath, rootInterfaceName);
        effectOnObjectNode(children, onNodeVisit(filepath, directoryLevel+1))
    }

    effectOnObjectNode(rest, onNodeVisit(buildPath))
}