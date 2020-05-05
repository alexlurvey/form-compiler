import { defmulti } from '@thi.ng/defmulti';
import { AST, Tree, Field, Interface, Node } from './api';
import { isArrayType } from './utils';

const NESTED = 'nested';
const LEAF = 'leaf';

const buildLeafPaths = defmulti<AST | Node>(([ _name, type ]: Field, interfaces: object, _path: Node[]) => {
    return interfaces[type] ? NESTED : LEAF;
})
buildLeafPaths.add(NESTED, ([ name, type ]: Field, interfaces: object, path: Node[]) => {
    const node = { name, type, isArray: isArrayType(type), path };
    return [ node, interfaces[type].map(f => buildLeafPaths(f, interfaces, path.concat(node))) ];
})
buildLeafPaths.add(LEAF, ([ name, type ]: Field, _interfaces: object, path: Node[]) => {
    return { name, type, isArray: isArrayType(type), path };
})

export const buildAst = (tree: Tree): AST[] => {
    const asts: AST[] = [];
    const intfcs = tree.reduce((acc, intfc) => {
        return (acc[intfc[0]] = intfc[1], acc);
    }, {})
    
    tree.forEach(([ name, fields ]: Interface) => {
        const rootNode = { name, type: name, path: [], isArray: false }
        asts.push([ rootNode, fields.map(f => buildLeafPaths(f, intfcs, [])) ]);
    })

    return asts;
}