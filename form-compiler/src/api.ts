export interface IObjectOf<T> {
    [id: string]: T;
}

export enum FileType {
    Index = 'index.ts',
    Paths = 'paths.ts',
    Streams = 'streams.ts',
    ArrayStreams = 'array-streams.ts',
    Hooks = 'hooks.ts',
    ArrayHooks = 'array-hooks.ts',
}

export enum FileName {
    Index = 'index.ts',
    Paths = 'paths.ts',
    Streams = 'streams.ts',
    Hooks = 'hooks.ts',
}

// initial AST generated from @thi.ng/parse
export type Prop = [ string, boolean, string ]; // [ name, required, type ]
export type EnumPairs = [ (string | number), (string | number) ]
export type Enum = [ 'enum', string, EnumPairs[] ];
export type Interface = [ string, Prop[] ];
export type Tree = (Interface | Enum)[];

// transformed AST
export type AST = [ Field, ASTItem[] ]
export type ASTItem = Field | AST;
export type Field = {
    type: string;
    name: string;
    path: Field[];
    isArray: boolean;
    isEnum: boolean;
    isInterface: boolean;
    required: boolean;
    intfc: Prop[];
}

// file contexts
export type IBaseFileContext = {
    schemaFilename: string,
    rootNode: Field,
    fileType: FileType,
    filepath: string,
    filename: FileName,
    directoryLevel: number,
    header: string,
    libraryImports: string[],
    localImports: IObjectOf<Set<string>>, // key is filename, value is a set of named exports
}

export type IPathFileContext = {
    setters: string[],
    getters: string[],
} & IBaseFileContext;

export type IStreamFileContext = {
    streams: Field[],
    descendantStreams: Field[],
} & IBaseFileContext;

export type IIndexFileContext = {
    fileType: FileType,
    filepath: string,
    filename: FileName,
}

export type IHooksFileContext = IStreamFileContext;
export type IFileContext = IPathFileContext | IStreamFileContext;