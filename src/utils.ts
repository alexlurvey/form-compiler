import { AST, Node, NodeField } from './api';

export const isNode = (node: AST | Node | NodeField[]) => typeof node === 'object' && node.hasOwnProperty('name')
    && node.hasOwnProperty('type') && node.hasOwnProperty('path') && node.hasOwnProperty('isArray');