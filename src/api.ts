export type Field = [ string, string ];
export type Interface = [ string, Field[] ];
export type Tree = Interface[];

export type Node = {
    type: string;
    name: string;
    path: string[];
    isArray: boolean;
}
export type NodeField = Node | AST;
export type AST = [ Node, NodeField[] ]

export interface IObjectOf<T> {
    [key: string]: T;
}