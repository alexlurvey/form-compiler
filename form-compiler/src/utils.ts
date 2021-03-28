import { defmulti } from '@thi.ng/defmulti';
import { ASTItem, FileType, IFileContext, Field } from './api';

const primitives = new Set(['string', 'boolean', 'number', 'Date']); // TODO: https://www.typescriptlang.org/docs/handbook/basic-types.html

export const noop = (..._args) => { return; };

export const isField = (node: ASTItem | ASTItem[]) => typeof node === 'object' && node.hasOwnProperty('name')
    && node.hasOwnProperty('type') && node.hasOwnProperty('path') && node.hasOwnProperty('isArray');

export const isObjectNode = (ast: ASTItem) => {
    return Array.isArray(ast) && ast.length == 2 && isField(ast[0]) && Array.isArray(ast[1]);
}
export const isEnum = (node: ASTItem) => isField(node) && (node as Field).isEnum;
export const isArrayOfFields = (node: ASTItem) => isField(node) && (node as Field).isInterface && (node as Field).isArray;

export const isPrimitive = defmulti(q => typeof q === 'object' ? 'field' : 'string')
isPrimitive.add('field', (x: Field) => primitives.has(x.type));
isPrimitive.add('string', (x: string) => primitives.has(x));

export const isTuple = (type: string): boolean => type.startsWith('[') && type.endsWith(']');

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

export const isStreamFileContext = (q: IFileContext) => typeof q === 'object' && q.fileType ===  FileType.Streams;
export const isPathFileContext = (q: IFileContext) => typeof q === 'object' && q.fileType === FileType.Paths;
export const isIndexFileContext = (q: IFileContext) => typeof q === 'object' && q.fileType === FileType.Index;
export const isHooksFileContext = (q: IFileContext) => typeof q === 'object' && q.fileType === FileType.Hooks;