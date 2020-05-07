import { AST, Node, NodeField } from './api';

const primitives = new Set(['string', 'boolean', 'number']); // TODO: https://www.typescriptlang.org/docs/handbook/basic-types.html

export const noop = (..._args) => { return; };

export const isNode = (node: AST | Node | NodeField[]) => typeof node === 'object' && node.hasOwnProperty('name')
    && node.hasOwnProperty('type') && node.hasOwnProperty('path') && node.hasOwnProperty('isArray');

export const isObjectNode = (ast: AST | NodeField) => {
    return Array.isArray(ast) && ast.length == 2 && isNode(ast[0]) && Array.isArray(ast[1]);
}

export const isPrimitive = (node: Node) => primitives.has(node.type);

export const upperCaseFirstChar = (str: string) => str.length ? str[0].toUpperCase() + str.slice(1) : str;

export const isArrayType = (str: string) => str.endsWith('[]') || str.startsWith('Array<');