import { defmulti } from '@thi.ng/defmulti';
import { AST, Tree, Field, Interface, Node } from './api';
import { isArrayType } from './utils';

const NESTED = 'nested';
const LEAF = 'leaf';

const buildLeafPaths = defmulti<AST | Node>(([ _name, type ]: Field, interfaces: object, enums: Set<string>, _path: Node[]) => {
    return interfaces[type] ? NESTED : LEAF;
})
buildLeafPaths.add(NESTED, ([ name, type ]: Field, interfaces: object, enums: Set<string>, path: Node[]) => {
    const node = { name, type, isArray: isArrayType(type), path, isEnum: false };
    return [ node, interfaces[type].map(f => buildLeafPaths(f, interfaces, enums, path.concat(node))) ];
})
buildLeafPaths.add(LEAF, ([ name, type ]: Field, _interfaces: object, enums: Set<string>, path: Node[]) => {
    return { name, type, isArray: isArrayType(type), isEnum: enums.has(type), path };
})

export const buildAst = (tree: Tree): AST[] => {
    const asts: AST[] = [];
    const intfcs = tree.reduce((acc, intfc) => {
        return (acc[intfc[0]] = intfc[1], acc);
    }, {})
    const enums = tree.reduce((acc, node) => {
        if (node[0] === 'enum') {
            acc.add(node[1][0])
        }
        return acc;
    }, new Set())
    
    tree.forEach(([ name, fields ]: Interface) => {
        const rootNode = { name, type: name, path: [], isArray: false, isEnum: false }
        asts.push([ rootNode, fields.map(f => buildLeafPaths(f, intfcs, enums, [])) ]);
    })

    return asts;
}