import { defContext } from '@thi.ng/parse';
import {
    copyFileSync,
    existsSync,
    readFileSync,
} from 'fs';
import { AST } from './src/api';
import { buildAst } from './src/ast-transforms';
import { buildFileContexts, writeToFile } from './src/file-writers';
import { program } from './src/parser';

const inputfile = process.argv.length > 2 && process.argv[2];

if (!inputfile) {
    console.error('Need a TypeScript file as first argument')
} else if (!existsSync(inputfile)) {
    console.error(`${inputfile} doesn't exist`);
} else {
    const [ schemaFilename, extension ] = inputfile.split('.');
    const schemaPath = __dirname + '/' + schemaFilename + '.' + extension;
    const buildPath = __dirname + '/build';

    const schema = readFileSync(schemaPath, 'utf8');
    const ctx = defContext(schema, { debug: false });
    program(ctx);
    const asts: AST[] = buildAst(ctx.result)

    // copy provided TS schema file
    copyFileSync(schemaPath, buildPath + '/' + schemaFilename + '.' + extension)
    const formAst = asts.filter((q: AST) => q[0].name === 'Form') // TODO

    const contexts = formAst.reduce(buildFileContexts(buildPath, schemaFilename), []);
    contexts.forEach(ctx => writeToFile(ctx))
}