import { defContext } from '@thi.ng/parse';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { Enum, FileType, Interface, Tree, IObjectOf, Prop } from './src/api';
import { buildAst } from './src/ast-transforms';
import { buildFileContexts, writeToFile } from './src/file-writers';
import { program } from './src/parser';

const inputfile = process.argv.length > 2 && process.argv[2];
if (!inputfile) {
    console.error('Need a TypeScript file as first argument');
    process.exit(1);
} else if (!existsSync(inputfile)) {
    console.error(`${inputfile} doesn't exist`);
    process.exit(1);
}

let tmpIdx;
const outdir = (tmpIdx = process.argv.indexOf('--outDir'), tmpIdx === -1 ? 'build' : process.argv[tmpIdx+1]);
const rootFormName = (tmpIdx = process.argv.indexOf('--rootName'), tmpIdx === -1 ? 'Form' : process.argv[tmpIdx+1]);

const [ schemaFilename, extension ] = inputfile.split('.');
const schemaPath = __dirname + '/' + schemaFilename + '.' + extension;
const buildPath = __dirname + '/' + outdir;

const schema = readFileSync(schemaPath, 'utf8');
const ctx = defContext(schema, { debug: false });
program(ctx);
const parseResult: Tree = ctx.result;

const allInterfaces: IObjectOf<Prop[]> = parseResult.reduce((acc, intfc: Interface) => {
    if (intfc[0] === 'enum') {
        return acc;
    }
    return (acc[intfc[0]] = intfc[1], acc);
}, {})
const allEnums: Set<string> = parseResult.reduce((acc, field: Enum) => {
    if (field[0] === 'enum') {
        acc.add(field[1])
    }
    return acc;
}, new Set<string>())

const formInterface: Interface = [ rootFormName, allInterfaces[rootFormName] ];
const ast = buildAst(formInterface, allInterfaces, allEnums);

const contexts = [ast].reduce(buildFileContexts(buildPath, schemaFilename), []);
const indexCtxs = Array.from(new Set(contexts.map(q => q.filepath)))
    .map(filepath => ({ filepath, filename: FileType.Index, fileType: FileType.Index }));

(!existsSync(buildPath) && mkdirSync(buildPath, { recursive: true }));
copyFileSync(schemaPath, buildPath + '/' + schemaFilename + '.' + extension);
[ ...contexts, ...indexCtxs ].forEach(ctx => writeToFile(ctx))