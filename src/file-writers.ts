import { defmulti } from '@thi.ng/defmulti';
import { reducer, transduce } from '@thi.ng/transducers';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { AST, IIndexFileContext, IPathFileContext, IStreamFileContext } from './api';
import { pathsXform, streamsXform } from './xform';
import { buildPathsFileContext, buildStreamsFileContext } from './file-contexts/defaults';
import {
    hookFromStream,
    hookFromArrayStream,
    thingImports,
    importStatement,
    buildStreamObj,
    syncedStreams,
    buildStreamGetters,
    buildStreamSetters,
    IArrayOps,
} from './templates';
import {
    isObjectNode,
    isStreamFileContext,
    isHooksFileContext,
    isPathFileContext,
    isIndexFileContext,
    lowercaseFirstChar,
    uppercaseFirstChar,
    isArrayType,
} from './utils';

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
            const pathsCtx = buildPathsFileContext(schemaFilename, base, filepath, directoryLevel, 
                pathsLibraryImports, pathsLocalImports);

            const streamsLibraryImports = [ thingImports.rstream(['sync, stream']) ];
            const streamsCtx = buildStreamsFileContext(schemaFilename, filepath, directoryLevel, streamsLibraryImports);

            acc.push(transduce(pathsXform(schemaFilename), reducer(() => pathsCtx, (acc, _) => acc), children));
            acc.push(transduce(streamsXform(schemaFilename), reducer(() => streamsCtx, (acc, _) => acc), children));
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
    const localImports = Object.keys(ctx.localImports).map(key => importStatement(Array.from(ctx.localImports[key]), key, ctx.directoryLevel));
    const imports = [ ...ctx.libraryImports, ...localImports ];
    (!existsSync(ctx.filepath) && mkdirSync(ctx.filepath, { recursive: true }))
    appendFileSync(fullpath, ctx.header);
    appendFileSync(fullpath, imports.join('\n').concat('\n\n'));
    appendFileSync(fullpath, buildStreamObj(ctx.streams));
    appendFileSync(fullpath, syncedStreams(ctx.filepath.split('/').reduce((_, x) => x, '')));
    appendFileSync(fullpath, buildStreamGetters(ctx.streams).join(''));
    appendFileSync(fullpath, buildStreamSetters(ctx.streams).join(''));
}

const writeIndexFile = (ctx: IIndexFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    (!existsSync(ctx.filepath) && mkdirSync(ctx.filepath, { recursive: true }))

    appendFileSync(fullpath, ctx.header);
    appendFileSync(fullpath, ctx.libraryImports.join('\n').concat('\n'));
    appendFileSync(fullpath, Object.keys(ctx.localImports)
        .map(key => importStatement(Array.from(ctx.localImports[key]), key)).join('\n').concat('\n\n'))

    const rootObj = `\nconst src = {\n\t...streams,\n${ctx.rootObjectProps.join('')}};\n\n`;
    const syncedStream = `export const ${lowercaseFirstChar(ctx.rootObjectName)} = sync({ src, mergeOnly: true })\n`;
    appendFileSync(fullpath, rootObj);
    appendFileSync(fullpath, syncedStream);
}

const writeHooksFile = (ctx: IStreamFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    const streamImports = importStatement(['streams', ...ctx.streams.map(([ name, _ ]) => {
        return `set${uppercaseFirstChar(name)}`;
    })], 'streams');
    const localImports = Object.keys(ctx.localImports).map(key => importStatement(Array.from(ctx.localImports[key]), key, ctx.directoryLevel));
    appendFileSync(fullpath, ctx.libraryImports.join('\n').concat('\n'));
    appendFileSync(fullpath, localImports.concat(streamImports).join('\n').concat('\n\n'));
    appendFileSync(fullpath, IArrayOps);
    appendFileSync(fullpath, ctx.streams.map(s => isArrayType(s[1]) ? hookFromArrayStream(s) : hookFromStream(s)).join('\n\n'))
}

export const writeToFile = defmulti(ctx => {
    // TODO: change context checks
    if (isHooksFileContext(ctx)) {
        return 'hooks';
    }
    if (isPathFileContext(ctx)) {
        return 'paths';
    }
    if (isStreamFileContext(ctx)) {
        return 'streams';
    }
    if (isIndexFileContext(ctx)) {
        return 'index';
    }
})

writeToFile.add('paths', writePathFile);
writeToFile.add('streams', writeStreamFile);
writeToFile.add('index', writeIndexFile);
writeToFile.add('hooks', writeHooksFile);