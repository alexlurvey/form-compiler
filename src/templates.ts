import { range } from '@thi.ng/transducers';
import { Node } from './api';

const setFnBody = (node: Node, rootType: string) => {
    const generics = node.path.reduce((acc, n: Node) => (acc += `, "${n.name}"`), rootType).concat(`, "${node.name}"`);
    const path = node.path.map(q => q.name).concat(node.name);
    return `return paths.setIn<${generics}>(root, ${JSON.stringify(path)}, ${node.name});`;
}

export const setFn = (node: Node, rootType: string, functionName: string) => {
return `export function set${functionName} (root: ${rootType}, ${node.name}: ${node.type}): ${rootType} {
    ${setFnBody(node, rootType)}
}\n\n`;
}

export const setFnRoot = (type: string) => {
const updateVariable = type.toLowerCase();
return `export function set${type} (root: ${type}, ${updateVariable}: ${type}): ${type} {
    return paths.setIn<${type}>(root, [], ${updateVariable});
}`
}

export const importStatement = (imports: string[], filename: string, levelFromRoot = 0) => {
    const relativePath = levelFromRoot === 0
        ? './'
        : Array.from(range(levelFromRoot)).reduce((acc, _) => (acc += '../', acc), '');
    return `import { ${imports.join(', ')} } from \'${relativePath}${filename}\';\n\n`;
}

export const importThingPaths = `import * as paths from '@thi.ng/paths';\n`;

export const initialComment = '// This file is auto-generated\n';