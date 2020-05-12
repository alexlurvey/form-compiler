import { defContext } from '@thi.ng/parse';
import { copyFileSync, existsSync, readFileSync } from 'fs';
import { AST, IStreamFileContext, IFileContext, IIndexFileContext } from './src/api';
import { buildAst, indexXform } from './src/ast-transforms';
import { buildFileContexts, writeToFile } from './src/file-writers';
import { program } from './src/parser';
import { buildIndexFileContext, streamToHooksContext } from './src/file-contexts/defaults';

import * as tx from '@thi.ng/transducers';
import { Reducer } from '@thi.ng/transducers';
import { thingImports } from './src/templates';
import { isStreamFileContext } from './src/utils';

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
    contexts.forEach(ctx => writeToFile(ctx))

    const streamfiles = <IStreamFileContext[]>contexts.filter(isStreamFileContext);

    const reducer = (init: IIndexFileContext) => <Reducer<IIndexFileContext, IFileContext>>[
        () => init,
        (acc) => acc,
        (acc, _) => acc
    ]

    const indexfiles = streamfiles.map(ctx => {
        const libraryImports = [ thingImports.rstream(['sync']) ];
        const localImports = { streams: new Set([ 'streams' ])};
        const rootObjectName = ctx.filepath.split('/').pop();
        const indexCtx = buildIndexFileContext(ctx.schemaFilename, ctx.filepath, ctx.directoryLevel,
            rootObjectName, libraryImports, localImports);
        return tx.transduce(indexXform(ctx), reducer(indexCtx), streamfiles);
    })

    indexfiles.forEach(ctx => writeToFile(ctx));

    const hookfiles = streamfiles.map(streamToHooksContext);
    hookfiles.forEach(ctx => writeToFile(ctx))
}