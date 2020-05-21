import { defContext } from '@thi.ng/parse';
import { copyFileSync, existsSync, readFileSync } from 'fs';
import { AST, IFileContext, FileType } from './src/api';
import { buildAst } from './src/ast-transforms';
import { buildFileContexts, writeToFile } from './src/file-writers';
import { program } from './src/parser';

const inputfile = process.argv.length > 2 && process.argv[2];

if (!inputfile) {
    console.error('Need a TypeScript file as first argument')
} else if (!existsSync(inputfile)) {
    console.error(`${inputfile} doesn't exist`);
} else {
    const outdir = process.argv.length > 3 ? process.argv[3] : 'build'
    const [ schemaFilename, extension ] = inputfile.split('.');
    const schemaPath = __dirname + '/' + schemaFilename + '.' + extension;
    const buildPath = __dirname + '/' + outdir;

    const schema = readFileSync(schemaPath, 'utf8');
    const ctx = defContext(schema, { debug: false });
    program(ctx);
    const asts: AST[] = buildAst(ctx.result)

    // copy provided TS schema file
    copyFileSync(schemaPath, buildPath + '/' + schemaFilename + '.' + extension)
    const formAst = asts.filter((q: AST) => q[0].name === 'Form') // TODO
    const contexts = formAst.reduce(buildFileContexts(buildPath, schemaFilename), []) as IFileContext[];
    const indexCtxs = Array.from(new Set(contexts.map(q => q.filepath)))
        .map(filepath => ({ filepath, filename: FileType.Index, fileType: FileType.Index }));

    [ ...contexts, ...indexCtxs ].forEach(ctx => writeToFile(ctx))
}