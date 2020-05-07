import { defmulti } from '@thi.ng/defmulti';
import * as tx from '@thi.ng/transducers';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { AST, IBaseFileContext, IPathFileContext, IStreamFileContext } from './api';
import { pathsXform, streamsXform } from './ast-transforms';
import { importThingPaths, importThingRstream, importStatement, buildStreamObj } from './templates';
import { isObjectNode } from './utils';

export const buildFileContexts = (buildpath: string, schemaFilename: string, baseInterface: string = null) => {
    return (acc: object[], x: AST) => {
        if (isObjectNode(x)) {
            const [ node, children ] = x;
            const base = baseInterface || node.name;
            const levels = baseInterface
                ? node.path.map(q => q.name).concat(node.name)
                : [];

            const baseCtx: IBaseFileContext = {
                schemaFilename,
                filepath: buildpath + '/' + base + '/' + levels.join('/'),
                directoryLevel: levels.length + 1,
                header: '',
            }

            const pathsCtx: IPathFileContext = {
                ...baseCtx,
                baseInterface: baseInterface || node.name,
                filename: 'paths.ts',
                libraryImports: [ importThingPaths ],
                localImports: new Set([ base ]),
                setters: [],
                getters: [],
            }

            const streamsCtx: IStreamFileContext = {
                ...baseCtx,
                filename: 'streams.ts',
                libraryImports: [ importThingRstream ],
                localImports: new Set(),
                streams: [],
            }

            acc.push(tx.transduce(pathsXform, tx.reducer(() => pathsCtx, (acc, _) => acc), children));
            acc.push(tx.transduce(streamsXform, tx.reducer(() => streamsCtx, (acc, _) => acc), children));
            acc.push(...children.reduce(buildFileContexts(buildpath, schemaFilename, base), []))
        }
        return acc;
    }
}

const writePathFile = (ctx: IPathFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    const distinctLocalImports: string[] = Array.from(ctx.localImports);
    const imports = [ ...ctx.libraryImports, importStatement(distinctLocalImports, ctx.schemaFilename, ctx.directoryLevel) ];
    (!existsSync(ctx.filepath) && mkdirSync(ctx.filepath, { recursive: true }))
    appendFileSync(fullpath, ctx.header);
    appendFileSync(fullpath, imports.join(''));
    appendFileSync(fullpath, ctx.setters.join(''))
    appendFileSync(fullpath, ctx.getters.join(''))
}

const writeStreamFile = (ctx: IStreamFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    const distinctLocalImports: string[] = Array.from(ctx.localImports);
    const imports = [ ...ctx.libraryImports, importStatement(distinctLocalImports, ctx.schemaFilename, ctx.directoryLevel) ];
    (!existsSync(ctx.filepath) && mkdirSync(ctx.filepath, { recursive: true }))
    appendFileSync(fullpath, ctx.header);
    appendFileSync(fullpath, imports.join(''));
    appendFileSync(fullpath, buildStreamObj(ctx.streams));
}

export const writeToFile = defmulti(ctx => {
    if (typeof ctx === 'object' && ctx.hasOwnProperty('setters')) {
        return 'paths';
    }
    if (typeof ctx === 'object' && ctx.hasOwnProperty('streams')) {
        return 'streams';
    }
})

writeToFile.add('paths', writePathFile);
writeToFile.add('streams', writeStreamFile);