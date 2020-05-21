import {
    Field,
    FileType,
    FileName,
    IObjectOf,
    IPathFileContext,
    IStreamFileContext,
    IHooksFileContext,
} from "../api"
import { thingImports, reactImports } from "../templates"

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
    filename: FileName.Paths,
    fileType: FileType.Paths,
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
    filename: FileName.Streams,
    fileType: FileType.Streams,
    header: '',
    streams: [],
    descendantStreams: [],
})

export const streamToHooksContext = (ctx: IStreamFileContext): IHooksFileContext => ({
    ...ctx,
    filename: FileName.Hooks,
    fileType: FileType.Hooks,
    libraryImports: [
        thingImports.transducers(['sideEffect']),
        reactImports([ 'useCallback', 'useEffect', 'useState' ]),
    ],
    localImports: {
        [ctx.schemaFilename]: ctx.localImports[ctx.schemaFilename],
    }
})