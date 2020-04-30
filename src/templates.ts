import { Node } from './api';

export const setFn = (node: Node, intfc: string) =>
    `export function set${node.name[0].toUpperCase()+node.name.slice(1)} (${node.name}: ${node.type}): void {\n\tconsole.log('updating ${intfc} at ${node.path.join('.')}');\n}\n\n`;

export const importStatement = (imports: string[], filename: string) =>
    `import { ${imports.join(', ')} } from \'./${filename}\';\n\n`;