import {
    Field,
    FileType,
    IObjectOf,
    IPathFileContext,
    IStreamFileContext,
    IHooksFileContext,
} from "./api"

export const buildPathsFileContext = (
    schemaFilename: string,
    rootNode: Field,
    filepath: string,
    directoryLevel: number,
    libraryImports = [] as string[],
    localImports = {} as IObjectOf<Set<string>>,
): IPathFileContext => ({
    schemaFilename,
    rootNode,
    filepath,
    directoryLevel,
    libraryImports,
    localImports,
    filename: FileType.Paths,
    header: '',
    setters: [],
    getters: [],
})

export const buildStreamsFileContext = (
    schemaFilename: string,
    rootNode: Field,
    filepath: string,
    directoryLevel: number,
    libraryImports = [] as string[],
    localImports = {} as IObjectOf<Set<string>>,
): IStreamFileContext => ({
    schemaFilename,
    rootNode,
    filepath,
    directoryLevel,
    libraryImports,
    localImports,
    filename: FileType.Streams,
    header: '',
    streams: [],
    rootObjectProps: [],
})

export const streamToHooksContext = (ctx: IStreamFileContext): IHooksFileContext => ({
    ...ctx,
    filename: FileType.Hooks,
    libraryImports: [
        "import { sideEffect } from '@thi.ng/transducers';",
        "import { useCallback, useEffect, useState } from 'react';",
    ],
    localImports: {
        [ctx.schemaFilename]: ctx.localImports[ctx.schemaFilename],
    }
})