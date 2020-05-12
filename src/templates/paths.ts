import { Node } from '../api';

const setFnBody = (node: Node, rootType: string): string => {
    const generics = node.path.reduce((acc, n: Node) => (acc += `, "${n.name}"`), rootType).concat(`, "${node.name}"`);
    const path = node.path.map(q => q.name).concat(node.name);
    return `return mutIn<${generics}>(root, ${JSON.stringify(path)}, ${node.name});`;
}

export const setFn = (node: Node, rootType: string, functionName: string) => {
return `export function set${functionName} (root: ${rootType}, ${node.name}: ${node.type}): ${rootType} {
    ${setFnBody(node, rootType)}
}\n\n`;
}

export const setFnRoot = (type: string): string => {
const updateVariable = type.toLowerCase();
return `export function set${type} (${updateVariable}: ${type}): ${type} {
    return (root = setIn<${type}>(root, [], ${updateVariable}), root);
}\n\n`
}

export const getFnRoot = (type: string): string => {
    return `const _get${type} = defGetter<${type}>([]);
export function get${type} () { return _get${type}(root); }`;
}

export const getFn = (node: Node, rootType: string, functionName: string): string => {
    const generics = node.path.reduce((acc, n: Node) => (acc += `, "${n.name}"`), rootType).concat(`, "${node.name}"`);
    const path = node.path.map(q => q.name).concat(node.name);
return `const _get${functionName} = defGetter<${generics}>(${JSON.stringify(path)});
export function get${functionName} (root: ${rootType}): ${node.type} {
    return _get${functionName}(root);
}\n\n`
}