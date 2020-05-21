import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { IHooksFileContext } from '../api';
import {
    importStatement,
    IArrayOps,
    hookFromStream,
    hookFromArrayStream,
    hookForFieldArray,
    hookForFieldArrayIds,
    hookForIndividualField,
} from '../templates';
import { uppercaseFirstChar } from '../utils';

export const writeHooksFile = (ctx: IHooksFileContext) => {
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

export const writeFieldArrayHooksFile = (ctx: IHooksFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    (!existsSync(ctx.filepath) && mkdirSync(ctx.filepath, { recursive: true }))
    const localImports = Object.keys(ctx.localImports).map(key => {
        if (key === ctx.schemaFilename) {
            return importStatement(Array.from(ctx.localImports[key]), key, ctx.directoryLevel)
        } else {
            return importStatement(Array.from(ctx.localImports[key]), key)
        }
    });
    ctx.libraryImports.length && appendFileSync(fullpath, ctx.libraryImports.join('\n').concat('\n'))
    localImports.length && appendFileSync(fullpath, localImports.join('\n').concat('\n\n'))
    appendFileSync(fullpath, hookForFieldArray(ctx).concat('\n\n'))
    appendFileSync(fullpath, hookForFieldArrayIds(ctx).concat('\n\n'))
    appendFileSync(fullpath, hookForIndividualField(ctx))
}