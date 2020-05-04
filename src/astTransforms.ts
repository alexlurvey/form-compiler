import { defmulti } from '@thi.ng/defmulti';
import { arrayZipper, Location } from '@thi.ng/zipper';
import { appendFileSync } from 'fs';
import { AST, Tree, Field, Interface, Node, NodeField } from './api';
import { setFn } from './templates';
import { isNode, upperCaseFirstChar } from './utils';

const NESTED = 'nested';
const LEAF = 'leaf';

const walk = (zipper: Location<Node | AST | (Node | AST)[]>, onNode) => {
    if (!zipper || !zipper.node)
        return;

    if (isNode(zipper.node))
        onNode(zipper.node)

    walk(zipper.next, onNode)
}

const buildLeafPaths = defmulti<AST | Node>(([ _name, type ]: Field, interfaces: object, _path: Node[]) => {
    return interfaces[type] ? NESTED : LEAF;
})
buildLeafPaths.add(NESTED, ([ name, type ]: Field, interfaces: object, path: Node[]) => {
    const isArray = type.endsWith('[]');
    const node = { name, type, isArray, path };
    return [ node, interfaces[type].map(f => buildLeafPaths(f, interfaces, path.concat(node))) ];
})
buildLeafPaths.add(LEAF, ([ name, type ]: Field, _interfaces: object, path: Node[]) => {
    const isArray = type.endsWith('[]');
    return { name, type, isArray, path };
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

export const importsForFile = (ast: NodeField[], interfaceNames: string[]): string[] => {
    const zipper = arrayZipper(ast);
    const result: string[] = [];
    const onNodeVisit = (node: Node) => interfaceNames.indexOf(node.type) !== -1 && result.push(node.type);
    walk(zipper.next, onNodeVisit);
    return Array.from(new Set(result));
}

const setNameXform = (typeCountsCtx: object) => (acc: string, node: Node) => {
    // loop through a nodes path, appending each parents name if there is more than one type of it used in the entire form.
    if (typeCountsCtx[node.type] > 1) {
        acc += upperCaseFirstChar(node.name);
    }
    return acc;
}

export const writeSimpleSettersToFile = (ast: NodeField[], file: string, intfc: string) => {
    const zipper = arrayZipper(ast);
    const typeCounts = getTypeCounts(ast);
    const fnNameForNode = (node: Node): string => {
        const parents = node.path.reduce(setNameXform(typeCounts), '');
        return parents.concat(upperCaseFirstChar(node.name));
    }
    const onNodeVisit = (node: Node) => {
        appendFileSync(file, setFn(node as Node, intfc, fnNameForNode(node)));
    }
    walk(zipper.next, onNodeVisit)
}

export const getTypeCounts = (ast: NodeField[]) => {
    const zipper = arrayZipper(ast);
    const allTypes: string[] = [];
    const onNodeVisit = (node: Node) => allTypes.push(node.type);
    walk(zipper.next, onNodeVisit);
    return allTypes.reduce((acc, type) => {
        acc[type] === undefined ? (acc[type] = 1) : acc[type]++;
        return acc;
    }, {})
}