import {
    IObjectOf,
    IPathFileContext,
    IStreamFileContext,
    IIndexFileContext,
    IHooksFileContext,
} from "../api"

export const buildPathsFileContext = (
    schemaFilename: string,
    baseInterface: string,
    filepath: string,
    directoryLevel: number,
    libraryImports = [] as string[],
    localImports = {} as IObjectOf<Set<string>>,
): IPathFileContext => ({
    schemaFilename,
    baseInterface,
    filepath,
    directoryLevel,
    libraryImports,
    localImports,
    filename: 'paths.ts',
    header: '',
    setters: [],
    getters: [],
})

export const buildStreamsFileContext = (
    schemaFilename: string,
    filepath: string,
    directoryLevel: number,
    libraryImports = [] as string[],
    localImports = {} as IObjectOf<Set<string>>,
): IStreamFileContext => ({
    schemaFilename,
    filepath,
    directoryLevel,
    libraryImports,
    localImports,
    filename: 'streams.ts',
    header: '',
    streams: [],
})

export const buildIndexFileContext = (
    schemaFilename: string,
    filepath: string,
    directoryLevel: number,
    rootObjectName: string,
    libraryImports = [] as string[],
    localImports = {} as IObjectOf<Set<string>>,
): IIndexFileContext => ({
    schemaFilename,
    filepath,
    directoryLevel,
    rootObjectName,
    libraryImports,
    localImports,
    filename: 'index.ts',
    header: '',
    rootObjectProps: [],
})

export const streamToHooksContext = (ctx: IStreamFileContext): IHooksFileContext => ({
    ...ctx,
    filename: 'hooks.ts',
    libraryImports: [
        "import { sideEffect } from '@thi.ng/transducers';",
        "import { useCallback, useEffect, useState } from 'react';",
    ],
})