import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { IStreamFileContext } from '../api';
import {
    buildStreamObj,
    buildStreamGetters,
    buildStreamSetters,
    buildStreamRemovers,
    buidlStreamAdders,
    buildDescendantStreamAdders,
    buildDescendantStreamRemovers,
    buildInitFunc,
    buildRemoveFunc,
    buildStreamsForFieldArray,
    buildNewStreamObjectFn,
    buildAddFn,
    buildRemoveFn,
    buildArrayOfFieldsInit,
    fieldArrayState,
} from '../templates';
import { lowercaseFirstChar } from '../utils';
import { getLocalImportStatements } from './helpers';

export const writeObjectStreamFile = (ctx: IStreamFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    const imports = [ ...(ctx?.libraryImports ?? []), ...getLocalImportStatements(ctx) ];
    (!existsSync(ctx.filepath) && mkdirSync(ctx.filepath, { recursive: true }))

    appendFileSync(fullpath, ctx.header);
    appendFileSync(fullpath, imports.join('\n').concat('\n\n'));
    appendFileSync(fullpath, `export let ${lowercaseFirstChar(ctx.rootNode.name)}: StreamSync<any, ${ctx.rootNode.type}>\n\n`);
    appendFileSync(fullpath, buildStreamObj(ctx.streams).concat('\n\n'));
    appendFileSync(fullpath, buildStreamGetters(ctx.streams).join('\n').concat('\n\n'));
    appendFileSync(fullpath, buildStreamSetters(ctx.streams).join('\n').concat('\n\n'));
    appendFileSync(fullpath, buildStreamRemovers(ctx.streams, ctx.rootNode).join('\n').concat('\n\n'))
    appendFileSync(fullpath, buidlStreamAdders(ctx.streams, ctx.rootNode).join('\n').concat('\n\n'));
    appendFileSync(fullpath, buildDescendantStreamAdders(ctx.descendantStreams, ctx.rootNode).join('\n').concat('\n\n'));
    appendFileSync(fullpath, buildDescendantStreamRemovers(ctx.descendantStreams, ctx.rootNode).join('\n').concat('\n\n'));
    appendFileSync(fullpath, buildInitFunc(ctx.rootNode, ctx.streams, ctx.descendantStreams).concat('\n\n'));
    appendFileSync(fullpath, buildRemoveFunc(ctx.rootNode));
}

export const writeArrayStreamFile = (ctx: IStreamFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    (!existsSync(ctx.filepath) && mkdirSync(ctx.filepath, { recursive: true }))
    const localImports = getLocalImportStatements(ctx);
    ctx?.libraryImports?.length && appendFileSync(fullpath, ctx.libraryImports.join('\n').concat('\n'))
    localImports.length && appendFileSync(fullpath, localImports.join('\n').concat('\n\n'))
    appendFileSync(fullpath, fieldArrayState.concat('\n\n'))
    appendFileSync(fullpath, buildStreamsForFieldArray(ctx).concat('\n\n'))
    appendFileSync(fullpath, buildNewStreamObjectFn(ctx).concat('\n\n'))
    appendFileSync(fullpath, buildAddFn(ctx).concat('\n\n'))
    appendFileSync(fullpath, buildRemoveFn(ctx).concat('\n\n'))
    appendFileSync(fullpath, buildArrayOfFieldsInit(ctx))
}