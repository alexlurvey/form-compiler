import { Node } from './api';

const setFnBody = (node: Node, rootType: string) => {
    const generics = node.path.reduce((acc, n: Node) => (acc += `, "${n.name}"`), rootType).concat(`, "${node.name}"`);
    const path = node.path.map(q => q.name).concat(node.name);
    return `return paths.setIn<${generics}>(root, ${JSON.stringify(path)}, ${node.name});`;
}

export const setFn = (node: Node, rootType: string, pathNameForNode: string) => {
return `export function ${pathNameForNode} (root: ${rootType}, ${node.name}: ${node.type}): ${rootType} {
    ${setFnBody(node, rootType)}
}\n\n`;
}

export const importStatement = (imports: string[], filename: string) =>
    `import { ${imports.join(', ')} } from \'./${filename}\';\n\n`;

export const importThingPaths = `import * as paths from '@thi.ng/paths';\n`;