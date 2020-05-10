import { defmulti } from '@thi.ng/defmulti';
import * as tx from '@thi.ng/transducers';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { AST, IBaseFileContext, IIndexFileContext, IPathFileContext, IStreamFileContext } from './api';
import { pathsXform, streamsXform } from './ast-transforms';
import {
    importThingPaths,
    importThingRstream,
    importStatement,
    buildStreamObj,
    syncedStreams,
    buildStreamGetters,
    buildStreamSetters,
    IArrayOps,
} from './templates';
import { isObjectNode, isStreamFileContext, isHooksFileContext, isPathFileContext, isIndexFileContext, lowercaseFirstChar, uppercaseFirstChar, isArrayType, typeOfArray } from './utils';

const primitiveDefaults = {
    string: '',
    boolean: false,
    number: 0,
}

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
                filepath: buildpath + '/' + base + `${levels.length ? '/' : ''}` + levels.join('/'),
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
    appendFileSync(fullpath, syncedStreams(ctx.filepath.split('/').reduce((_, x) => x, '')));
    appendFileSync(fullpath, buildStreamGetters(ctx.streams).join(''));
    appendFileSync(fullpath, buildStreamSetters(ctx.streams).join(''));
}

const writeIndexFile = (ctx: IIndexFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    (!existsSync(ctx.filepath) && mkdirSync(ctx.filepath, { recursive: true }))

    appendFileSync(fullpath, ctx.header);
    appendFileSync(fullpath, ctx.libraryImports.join(''));
    appendFileSync(fullpath, ctx.imports.join(''));

    const rootObj = `\nconst src = {\n\t...streams,\n${ctx.rootObjectProps.join('')}};\n\n`;
    const syncedStream = `export const ${lowercaseFirstChar(ctx.rootObjectName)} = sync({ src, mergeOnly: true })\n`;
    appendFileSync(fullpath, rootObj);
    appendFileSync(fullpath, syncedStream);
}

const hookFromStream = ([ name, type ]: [string, string]) => {
    const defaultVal = JSON.stringify(primitiveDefaults[type]);
    const fn = `export const use${uppercaseFirstChar(name)} = (): [ ${type}, (x: ${type}) => void ] => {\n`;
    const state = `\tconst [ value, setValue ] = useState<${type}>(() => streams.${name}.deref() || ${defaultVal});\n\n`;
    const fx = `\tuseEffect(() => {
        const sub = streams.${name}.subscribe(sideEffect((val: ${type}) => setValue(val)));
        return () => sub.done();
    }, [])\n\n`;
    const cb = `\tconst setter = useCallback((val: ${type}) => {
        set${uppercaseFirstChar(name)}(val);
    }, [])\n\n`;
    const ret = `\treturn [ value, setter ];\n`;
    return `${fn}${state}${fx}${cb}${ret}}`;
}

const hookFromArrayStream = ([name, type]: [string, string]) => {
    const fn = `export const use${uppercaseFirstChar(name)} = (): [ ${type}, (x: ${type}) => void, IArrayOps<${typeOfArray(type)}> ] => {\n`;
    const state = `\tconst [ value, setValue ] = useState<${type}>(() => streams.${name}.deref() || []);\n\n`;
    const fx = `\tuseEffect(() => {
        const sub = streams.${name}.subscribe(sideEffect((val: ${type}) => setValue(val)));
        return () => sub.done();
    }, [])\n\n`;
    const cb = `\tconst setter = useCallback((val: ${type}) => {
        set${uppercaseFirstChar(name)}(val);
    }, [])\n\n`;
    const arrayOps = buildArrayOps([name, type]);
    const ret = `\treturn [ value, setter, { push, pop, removeAt, shift, unshift } ];\n`;
    return `${fn}${state}${fx}${cb}${arrayOps}${ret}}`;
}

const buildArrayOps = (stream: [string, string]) => {
    return `\tconst push = ${pushCallback(stream)}
    const pop = ${popCallback(stream)}
    const removeAt = ${removeAtCallback(stream)}
    const shift = ${shiftCallback(stream)}
    const unshift = ${unshiftCallback(stream)}\n`
}

// array ops for hooks
const pushCallback = ([ name, type ]: [string, string]) => {
    return `useCallback((value: ${typeOfArray(type)}) => {
        const current = streams.${name}.deref() || [];
        set${uppercaseFirstChar(name)}(current.concat(value));
    }, [])`;
}

const popCallback = ([name, type]: [string, string]) => {
    return `useCallback(() => {
        const current = streams.${name}.deref() || [];
        set${uppercaseFirstChar(name)}((current.pop(), current));
    }, [])`;
}

const shiftCallback = ([name, type]: [string, string]) => {
    return `useCallback(() => {
        const current = streams.${name}.deref() || [];
        set${uppercaseFirstChar(name)}((current.shift(), current));
    }, [])`
}

const unshiftCallback = ([name, type]: [string, string]) => {
    return `useCallback((value: ${typeOfArray(type)}) => {
        const current = streams.${name}.deref() || [];
        set${uppercaseFirstChar(name)}((current.unshift(value), current));
    }, [])`
}

const removeAtCallback = ([name, type]: [string, string]) => {
    return `useCallback((idx: number) => {
        const current = streams.${name}.deref() || [];
        set${uppercaseFirstChar(name)}(current.slice(0, idx).concat(current.slice(idx+1)));
    }, [])`
}

const writeHooksFile = (ctx: IStreamFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    const streamImports = Array.from(ctx.localImports).concat(ctx.streams.map(([ name, _ ]) => {
        return `set${uppercaseFirstChar(name)}`;
    }))
    appendFileSync(fullpath, ctx.libraryImports.join('\n').concat('\n'));
    appendFileSync(fullpath, importStatement(streamImports, 'streams'));
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