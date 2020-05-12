export interface IObjectOf<T> {
    [id: string]: T;
}

// initial AST generate from @thi.ng/parse
export type Field = [ string, string ];
export type Enum = [ 'enum', [ string ]];
export type Interface = [ string, Field[] ];
export type Tree = Interface[];

// transformed AST
export type Node = {
    type: string;
    name: string;
    path: Node[];
    isArray: boolean;
    isEnum: boolean;
}
export type AST = [ Node, (Node | AST)[] ]
export type ASTItem = Node | AST;

// file contexts
export type IBaseFileContext = {
    schemaFilename: string,
    filepath: string,
    filename?: string,
    directoryLevel: number,
    header: string,
    libraryImports?: string[],
    localImports?: IObjectOf<Set<string>>, // key is filename, value is a set of named exports
}

export type IPathFileContext = {
    baseInterface: string,
    setters: string[],
    getters: string[],
} & IBaseFileContext;

export type IStreamFileContext = {
    streams: [string, string][],
} & IBaseFileContext;

export type IIndexFileContext = {
    rootObjectName: string,
    rootObjectProps: string[],
} & IBaseFileContext;

export type IHooksFileContext = IStreamFileContext;

export type IFileContext = IPathFileContext | IStreamFileContext;