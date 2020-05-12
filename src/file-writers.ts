import { defmulti, DEFAULT } from '@thi.ng/defmulti';
import { reducer, transduce, Reducer } from '@thi.ng/transducers';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import {
    AST,
    IIndexFileContext,
    IPathFileContext,
    IStreamFileContext,
    FileType,
    IFileContext,
    IHooksFileContext,
} from './api';
import { pathsXform, streamsXform, hooksXform } from './xform';
import { buildPathsFileContext, buildStreamsFileContext, streamToHooksContext } from './file-context-builders';
import {
    hookFromStream,
    hookFromArrayStream,
    thingImports,
    importStatement,
    buildStreamObj,
    buildStreamGetters,
    buildStreamSetters,
    IArrayOps,
    syncedSourceType,
    syncedStreams,
    rootObjectSources,
    indexFileContent,
} from './templates';
import {
    isObjectNode,
    uppercaseFirstChar,
    isArrayType,
    isStreamFileContext,
} from './utils';

const defaultReducer = (init: IFileContext) => reducer(() => init, (acc, _) => acc);
const streamReducer = (init: IStreamFileContext) => {
    return reducer(() => init, (acc, _x) => {
        if (isStreamFileContext(acc)) {
            // add root node type to local imports
            const set = acc.localImports[acc.schemaFilename] || new Set();
            acc.localImports[acc.schemaFilename] = set.add(acc.rootNode.type);
        }
        return acc;
    })
}

export const fileContextReducer = defmulti<IFileContext, Reducer<IFileContext, AST>>(ctx => ctx.filename);
fileContextReducer.add(FileType.Streams, streamReducer);
fileContextReducer.add(DEFAULT, defaultReducer)


export const buildFileContexts = (buildpath: string, schemaFilename: string, baseInterface: string = null) => {
    return (acc: object[], x: AST) => {
        if (isObjectNode(x)) {
            const [ node, children ] = x;
            const base = baseInterface || node.name;
            const levels = baseInterface
                ? node.path.map(q => q.name).concat(node.name)
                : [];

            const filepath = buildpath + '/' + base + `${levels.length ? '/' : ''}` + levels.join('/');
            const directoryLevel = levels.length + 1;

            const pathsLibraryImports = [ thingImports.paths(['mutIn, defGetter']) ];
            const pathsLocalImports = { [schemaFilename]: new Set([ base ]) };
            const pathsCtx = buildPathsFileContext(schemaFilename, node, filepath, directoryLevel, 
                pathsLibraryImports, pathsLocalImports);

            const streamsLibraryImports = [ thingImports.rstream(['ISubscribable', 'sync', 'stream']) ];
            const streamsCtx = buildStreamsFileContext(schemaFilename, node, filepath, directoryLevel, streamsLibraryImports);

            acc.push(transduce(pathsXform(schemaFilename), fileContextReducer(pathsCtx), children));
            acc.push(transduce(streamsXform(schemaFilename), fileContextReducer(streamsCtx), children));
            acc.push(transduce(hooksXform(schemaFilename), fileContextReducer(streamToHooksContext(streamsCtx)), children));
            acc.push(...children.reduce(buildFileContexts(buildpath, schemaFilename, base), []))
        }
        return acc;
    }
}

const writePathFile = (ctx: IPathFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    const localImports: string[] = Object.keys(ctx.localImports)
        .map(key => importStatement(Array.from(ctx.localImports[key]), key, ctx.directoryLevel));
    const imports = [ ...ctx.libraryImports, ...localImports ];
    (!existsSync(ctx.filepath) && mkdirSync(ctx.filepath, { recursive: true }))
    appendFileSync(fullpath, ctx.header);
    appendFileSync(fullpath, imports.join('\n').concat('\n\n'));
    appendFileSync(fullpath, ctx.setters.join(''))
    appendFileSync(fullpath, ctx.getters.join(''))
}

const writeStreamFile = (ctx: IStreamFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    const localImports = Object.keys(ctx.localImports).map(key => {
        if (key === ctx.schemaFilename) {
            return importStatement(Array.from(ctx.localImports[key]), key, ctx.directoryLevel)
        } else {
            return importStatement(Array.from(ctx.localImports[key]), key)
        }
    });
    const imports = [ ...ctx.libraryImports, ...localImports ];
    (!existsSync(ctx.filepath) && mkdirSync(ctx.filepath, { recursive: true }))

    appendFileSync(fullpath, ctx.header);
    appendFileSync(fullpath, imports.join('\n').concat('\n\n'));
    appendFileSync(fullpath, syncedSourceType(ctx.rootNode).concat('\n\n'));
    appendFileSync(fullpath, buildStreamObj(ctx.streams));
    appendFileSync(fullpath, buildStreamGetters(ctx.streams).join(''));
    appendFileSync(fullpath, buildStreamSetters(ctx.streams).join(''));
    appendFileSync(fullpath, rootObjectSources(ctx.rootNode, ctx.rootObjectProps).concat('\n\n'));
    appendFileSync(fullpath, syncedStreams(ctx.rootNode).concat('\n\n'));
}

const writeIndexFile = (ctx: IIndexFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    (!existsSync(ctx.filepath) && mkdirSync(ctx.filepath, { recursive: true }))
    appendFileSync(fullpath, indexFileContent);
}

const writeHooksFile = (ctx: IHooksFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    const hasArrayField = ctx.streams.reduce((acc, x) => x.isArray || acc, false);
    const streamImports = importStatement(['streams', ...ctx.streams.map(({ name }) => {
        return `set${uppercaseFirstChar(name)}`;
    })], 'streams');
    const localImports = Object.keys(ctx.localImports).map(key => importStatement(Array.from(ctx.localImports[key]), key, ctx.directoryLevel));
    appendFileSync(fullpath, ctx.libraryImports.join('\n').concat('\n'));
    appendFileSync(fullpath, localImports.concat(streamImports).join('\n').concat('\n\n'));
    (hasArrayField && appendFileSync(fullpath, IArrayOps));
    appendFileSync(fullpath, ctx.streams.map(s => s.isArray ? hookFromArrayStream(s) : hookFromStream(s)).join('\n\n'))
}

export const writeToFile = defmulti(ctx => ctx.filename);
writeToFile.add(FileType.Paths, writePathFile);
writeToFile.add(FileType.Streams, writeStreamFile);
writeToFile.add(FileType.Index, writeIndexFile);
writeToFile.add(FileType.Hooks, writeHooksFile);