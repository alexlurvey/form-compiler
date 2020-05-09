import { defContext } from '@thi.ng/parse';
import {
    copyFileSync,
    existsSync,
    readFileSync,
} from 'fs';
import { AST, IBaseFileContext, IStreamFileContext, IFileContext, IIndexFileContext } from './src/api';
import { buildAst, indexXform } from './src/ast-transforms';
import { buildFileContexts, writeToFile } from './src/file-writers';
import { program } from './src/parser';

import * as tx from '@thi.ng/transducers';
import { Reducer } from '@thi.ng/transducers';
import { importThingRstream } from './src/templates';

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

    const contexts = formAst.reduce(buildFileContexts(buildPath, schemaFilename), []) as IFileContext[];
    contexts.forEach(ctx => writeToFile(ctx))

    const streamfiles = contexts.filter((q: IBaseFileContext) => typeof q === 'object' && q.hasOwnProperty('streams')) as IStreamFileContext[];

    const reducer = (init: IIndexFileContext) => <Reducer<IIndexFileContext, IFileContext>>[
        () => init,
        (acc) => acc,
        (acc, _) => acc
    ]

    const indexfiles = streamfiles.map(ctx => {
        const baseCtx: IBaseFileContext = {
            schemaFilename: ctx.schemaFilename,
            filepath: ctx.filepath,
            directoryLevel: ctx.directoryLevel,
            libraryImports: [ importThingRstream ],
            header: '',
            filename: 'index.ts',
        }
        const rootObjectName = ctx.filepath.split('/').pop();
        const imports = [ "import { streams } from './streams';\n" ];
        const initCtx: IIndexFileContext = { ...baseCtx, imports, rootObjectName, rootObjectProps: [] };
        return tx.transduce(indexXform(ctx), reducer(initCtx), streamfiles);
    })

    indexfiles.forEach(ctx => writeToFile(ctx));
}