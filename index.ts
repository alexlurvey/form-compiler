import { defContext } from '@thi.ng/parse';
import { copyFileSync, existsSync, readFileSync } from 'fs';
import { AST, IFileContext, FileType } from './src/api';
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
const asts: AST[] = buildAst(ctx.result)

// copy provided TS schema file
copyFileSync(schemaPath, buildPath + '/' + schemaFilename + '.' + extension)

const formAst = asts.filter((q: AST) => q[0].name === rootFormName)
const contexts = formAst.reduce(buildFileContexts(buildPath, schemaFilename), []) as IFileContext[];

const indexCtxs = Array.from(new Set(contexts.map(q => q.filepath)))
    .map(filepath => ({ filepath, filename: FileType.Index, fileType: FileType.Index }));

[ ...contexts, ...indexCtxs ].forEach(ctx => writeToFile(ctx))