import { defmulti } from '@thi.ng/defmulti';
import * as tx from '@thi.ng/transducers';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { AST, IBaseFileContext, IIndexFileContext, IPathFileContext, IStreamFileContext } from './api';
import { pathsXform, streamsXform } from './ast-transforms';
import { importThingPaths, importThingRstream, importStatement, buildStreamObj, syncedStreams, buildStreamGetters, buildStreamSetters } from './templates';
import { isObjectNode, isStreamFileContext, isHooksFileContext, isPathFileContext, isIndexFileContext, lowercaseFirstChar, uppercaseFirstChar, isArrayType } from './utils';

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

const hookForStream = ([ name, type ]: [string, string]) => {
    const fn = `export const use${uppercaseFirstChar(name)} = (): [ ${type}, (x: ${type}) => void ] => {\n`;
    const state = `\tconst [ value, setValue ] = useState<${type}>(() => streams.${name}.deref());\n\n`;
    const fx = `\tuseEffect(() => {
        const sub = streams.${name}.subscribe(sideEffect((val: ${type}) => setValue(val)));
        return () => sub.done();
    }, [])\n\n`;
    const cb = `\tconst setter = useCallback((val: ${type}) => {
        set${uppercaseFirstChar(name)}(val);
    }, [])\n\n`
    const ret = `\treturn [ value, setter ];\n`;
    return `${fn}${state}${fx}${cb}${ret}}`;
}

const writeHooksFile = (ctx: IStreamFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    const streamImports = Array.from(ctx.localImports).concat(ctx.streams.map(([ name, _ ]) => {
        return `set${uppercaseFirstChar(name)}`;
    }))
    appendFileSync(fullpath, ctx.libraryImports.join('\n'));
    appendFileSync(fullpath, importStatement(streamImports, 'streams').concat('\n\n'));
    appendFileSync(fullpath, ctx.streams.map(hookForStream).join('\n\n'))
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