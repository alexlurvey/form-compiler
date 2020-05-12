import { defContext } from '@thi.ng/parse';
import { copyFileSync, existsSync, readFileSync } from 'fs';
import { AST, IStreamFileContext, IFileContext, IIndexFileContext } from './src/api';
import { buildAst } from './src/ast-transforms';
import { indexXform } from './src/xform';
import { buildFileContexts, writeToFile } from './src/file-writers';
import { program } from './src/parser';
import { buildIndexFileContext, streamToHooksContext } from './src/file-contexts/defaults';

import { transduce } from '@thi.ng/transducers';
import { Reducer } from '@thi.ng/transducers';
import { thingImports } from './src/templates';
import { isStreamFileContext } from './src/utils';

const inputfile = process.argv.length > 2 && process.argv[2];

const reducer = (init: IIndexFileContext) => <Reducer<IIndexFileContext, IFileContext>>[
    () => init,
    (acc) => acc,
    (acc, _) => acc
]

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
    const streamfiles = <IStreamFileContext[]>contexts.filter(isStreamFileContext);
    const indexCtxs = streamfiles
        .map((ctx: IStreamFileContext) => {
            const libraryImports = [ thingImports.rstream(['sync']) ];
            const localImports = { streams: new Set([ 'streams' ])};
            const rootObjectName = ctx.filepath.split('/').pop();
            const indexCtx = buildIndexFileContext(ctx.schemaFilename, ctx.filepath, ctx.directoryLevel,
                rootObjectName, libraryImports, localImports);
            return transduce(indexXform(ctx), reducer(indexCtx), streamfiles);
        })
    const hooksCtxs = streamfiles.map(streamToHooksContext);

    [ ...contexts, ...indexCtxs, ...hooksCtxs ].forEach(ctx => writeToFile(ctx))
}