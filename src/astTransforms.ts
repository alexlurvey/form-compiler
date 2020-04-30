import { defmulti } from '@thi.ng/defmulti';
import { arrayZipper, Location } from '@thi.ng/zipper';
import { appendFileSync } from 'fs';
import { AST, Tree, Field, Interface, Node, NodeField } from './api';
import { setFn } from './templates';
import { isNode } from './utils';

const NESTED = 'nested';
const LEAF = 'leaf';

const buildLeafPaths = defmulti<AST | Node>(([ _name, type ]: Field, interfaces: object, _path: string[]) => {
    return interfaces[type] ? NESTED : LEAF;
})
buildLeafPaths.add(NESTED, ([ name, type ]: Field, interfaces: object, path: string[]) => {
    const p = path.concat(name);
    const isArray = type.endsWith('[]');
    const node = { name, type, isArray, path: p }
    return [ node, interfaces[type].map(f => buildLeafPaths(f, interfaces, p)) ];
})
buildLeafPaths.add(LEAF, ([ name, type ]: Field, _interfaces: object, path: string[]) => {
    const isArray = type.endsWith('[]');
    return { name, type, isArray, path: path.concat(name) };
})

export const buildAst = (tree: Tree): AST[] => {
    const asts: AST[] = [];
    const intfcs = tree.reduce((acc, intfc) => {
        return (acc[intfc[0]] = intfc[1], acc);
    }, {})
    
    tree.forEach(([ name, fields ]: Interface) => {
        const rootNode = { name, type: 'interface', path: [], isArray: false }
        asts.push([ rootNode, fields.map(f => buildLeafPaths(f, intfcs, [])) ]);
    })

    return asts;
}

const walk = (zipper: Location<Node | AST | (Node | AST)[]>, onNode) => {
    if (!zipper || !zipper.node)
        return
    
    if (isNode(zipper.node))
        onNode(zipper.node)

    walk(zipper.next, onNode)
}

export const importsForFile = (ast: NodeField[], interfaceNames: string[]) => {
    const zipper = arrayZipper(ast);
    const result = []
    const onNodeVisit = (node: Node) => interfaceNames.indexOf(node.type) !== -1 && result.push(node.type);
    walk(zipper.next, onNodeVisit);
    return Array.from(new Set(result));
}

export const writeSimpleSettersToFile = (ast: NodeField[], file: string, intfc: string) => {
    const zipper = arrayZipper(ast);
    const onNodeVisit = (node: Node) => appendFileSync(file, setFn(node as Node, intfc));
    walk(zipper.next, onNodeVisit)
}