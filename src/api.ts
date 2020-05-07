export type Field = [ string, string ];
export type Interface = [ string, Field[] ];
export type Tree = Interface[];

export type Node = {
    type: string;
    name: string;
    path: Node[];
    isArray: boolean;
}
export type NodeField = Node | AST;
export type AST = [ Node, NodeField[] ]

export type IBaseFileContext = {
    schemaFilename: string,
    filepath: string,
    filename?: string,
    directoryLevel: number,
    header: string,
    libraryImports?: string[],
    localImports?: Set<string>,
}

export type IPathFileContext = {
    baseInterface: string,
    setters: string[],
    getters: string[],
} & IBaseFileContext;

export type IStreamFileContext = {
    streams: [string, string][],
} & IBaseFileContext;