import { AST, IFileContext, Node, NodeField } from './api';

const primitives = new Set(['string', 'boolean', 'number']); // TODO: https://www.typescriptlang.org/docs/handbook/basic-types.html

export const noop = (..._args) => { return; };

export const isNode = (node: AST | Node | NodeField[]) => typeof node === 'object' && node.hasOwnProperty('name')
    && node.hasOwnProperty('type') && node.hasOwnProperty('path') && node.hasOwnProperty('isArray');

export const isObjectNode = (ast: AST | NodeField) => {
    return Array.isArray(ast) && ast.length == 2 && isNode(ast[0]) && Array.isArray(ast[1]);
}

export const isPrimitive = (node: Node) => primitives.has(node.type);

export const uppercaseFirstChar = (str: string) => str.length ? str[0].toUpperCase() + str.slice(1) : str;
export const lowercaseFirstChar = (str: string) => str.length ? str[0].toLocaleLowerCase() + str.slice(1) : str;

export const isArrayType = (str: string) => str.endsWith('[]') || str.startsWith('Array<');

export const typeOfArray = (str: string) => {
    if (str.endsWith('[]')) {
        return str.slice(0, str.length-2);
    } else if (str.startsWith('Array<') && str.endsWith('>')) {
        return str.slice(6, str.length-1);
    } else {
        return str;
    }
}

export const isStreamFileContext = (q: IFileContext) => typeof q === 'object' && q.hasOwnProperty('streams');
export const isPathFileContext = (q: IFileContext) => typeof q === 'object' && q.hasOwnProperty('getters');
export const isIndexFileContext = (q: IFileContext) => typeof q === 'object' && q.hasOwnProperty('rootObjectProps');
export const isHooksFileContext = (q: IFileContext) => typeof q === 'object' && q.filename === 'hooks.ts';