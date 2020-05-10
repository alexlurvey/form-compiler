import { range } from '@thi.ng/transducers';
import { Node } from './api';
import { uppercaseFirstChar } from './utils';

const setFnBody = (node: Node, rootType: string): string => {
    const generics = node.path.reduce((acc, n: Node) => (acc += `, "${n.name}"`), rootType).concat(`, "${node.name}"`);
    const path = node.path.map(q => q.name).concat(node.name);
    return `return paths.mutIn<${generics}>(root, ${JSON.stringify(path)}, ${node.name});`;
}

export const setFn = (node: Node, rootType: string, functionName: string) => {
return `export function set${functionName} (root: ${rootType}, ${node.name}: ${node.type}): ${rootType} {
    ${setFnBody(node, rootType)}
}\n\n`;
}

export const setFnRoot = (type: string): string => {
const updateVariable = type.toLowerCase();
// return `export function set${type} (root: ${type}, ${updateVariable}: ${type}): ${type} {
return `export function set${type} (${updateVariable}: ${type}): ${type} {
    return (root = paths.setIn<${type}>(root, [], ${updateVariable}), root);
}\n\n`
}

export const getFnRoot = (type: string): string => {
    return `const _get${type} = paths.defGetter<${type}>([]);
export function get${type} () { return _get${type}(root); }`;
}

export const getFn = (node: Node, rootType: string, functionName: string): string => {
    const generics = node.path.reduce((acc, n: Node) => (acc += `, "${n.name}"`), rootType).concat(`, "${node.name}"`);
    const path = node.path.map(q => q.name).concat(node.name);
return `const _get${functionName} = paths.defGetter<${generics}>(${JSON.stringify(path)});
export function get${functionName} (root: ${rootType}): ${node.type} {
    return _get${functionName}(root);
}\n\n`
}

export const importStatement = (imports: string[], filename: string, levelFromRoot = 0) => {
    const relativePath = levelFromRoot === 0
        ? './'
        : Array.from(range(levelFromRoot)).reduce((acc, _) => (acc += '../', acc), '');
    return `import { ${imports.join(', ')} } from \'${relativePath}${filename}\';\n\n`;
}

export const importThingPaths = "import * as paths from '@thi.ng/paths';\n";
export const importThingRstream = "import { stream, sync } from '@thi.ng/rstream';\n";
export const initialComment = '// This file is auto-generated\n';
export const IArrayOps = `interface IArrayOps<T> {
    pop(): void;
    push(value: T): void;
    removeAt(idx: number): void;
    shift(): void;
    unshift(value: T): void;
}\n\n`

export const buildStreamObj = (properties: [ string, string ][]) => {
    let result = 'export const streams = {\n';
    properties.forEach(([ name, type ]) => {
        result += `\t${name}: stream<${type}>(),\n`
    })
    result += '};\n\n';
    return result;
}

export const buildStreamGetters = (streams: [ string, string ][]) => {
    let result: string[] = [];
    streams.forEach(([ name, type ]) => {
        const getter = `export function get${uppercaseFirstChar(name)} (): ${type} | undefined {
    return streams.${name}.deref();
}\n`;
        result.push(getter)
    });
    return result;
}

export const buildStreamSetters = (streams: [ string, string ][]) => {
    let result: string[] = [];
    streams.forEach(([ name, type ]) => {
        const setter = `export function set${uppercaseFirstChar(name)} (value: ${type}): void {
    streams.${name}.next(value);
}\n`;
        result.push(setter);
    })
    return result;
}

export const syncedStreams = (varName) =>
    `export const ${varName} = sync<any, any>({ src: streams });\n\n`;