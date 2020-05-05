import { arrayZipper, Location } from '@thi.ng/zipper';
import { appendFileSync } from 'fs';
import { AST, Node, NodeField } from './api';
import { setFn } from './templates';
import { isNode, upperCaseFirstChar } from './utils';

/**
 * An object node is defined as 2 tuple [ Node, NodeField[] ] or
 * [ zipper.down, zipper.down.next ]
 * zipper.down !== undefined -> current node is a tuple/array
 * @param zipper
 */
const isObjectNode = (zipper: Location<Node | AST | (AST | Node)[]>): boolean => {
    return zipper.down !== undefined && isNode(zipper.down.node) &&
        zipper.down.next !== undefined && zipper.down.next.down !== undefined;
}

const walkObjectNodes = (
    zipper: Location<Node | AST | (Node | AST)[]>,
    onNodeVisit: (node: Node, children: (Node | NodeField)[]) => void,
) => {
    if (!zipper || !zipper.node)
        return;

    if (isObjectNode(zipper)) {
        onNodeVisit(zipper.down.node as Node, zipper.down.next.node as NodeField[])
        walkObjectNodes(zipper.down.next.down.rightmost.next, onNodeVisit);
    } else {
        walkObjectNodes(zipper.next, onNodeVisit)
    }
}

const walkAllNodes = (zipper: Location<Node | AST | (Node | AST)[]>, onNode) => {
    if (!zipper || !zipper.node)
        return;

    if (isNode(zipper.node))
        onNode(zipper.node)

    walkAllNodes(zipper.next, onNode)
}

/**
 * Run a function for every node in an AST.
 * @param ast the AST to traverse
 * @param onNodeVisit function that's called for every node encountered
 */
export const effectOnNode = (ast: NodeField[], onNodeVisit: (node: Node) => void) => {
    const zip = arrayZipper(ast);
    walkAllNodes(zip, onNodeVisit);
}

/**
 * Run a function for every object node in an AST.
 * @param ast the AST to traverse
 * @param onNodeVisit function that's called for every object node encountered
 */
export const effectOnObjectNode = (ast: NodeField[], onNodeVisit: (node: Node, children: NodeField[]) => void) => {
    const zip = arrayZipper(ast);
    walkObjectNodes(zip, onNodeVisit);
}

/**
 * Traverse an AST and collect all the interface types used within it.
 * @param ast the AST to traverse
 * @param interfaceNames global list of interfaces
 */
export const importsForFile = (ast: NodeField[], interfaceNames: string[]): string[] => {
    const zipper = arrayZipper(ast);
    const result: string[] = [];
    const onNodeVisit = (node: Node) => interfaceNames.indexOf(node.type) !== -1 && result.push(node.type);
    walkAllNodes(zipper.next, onNodeVisit);
    return Array.from(new Set(result));
}

/**
 * Traverse an AST and write setter functions for each property
 * @param ast the AST to traverse
 * @param file path of file to write to
 * @param intfc the type of the root object
 */
export const writeSimpleSettersToFile = (ast: NodeField[], file: string, intfc: string) => {
    const zipper = arrayZipper(ast);
    const onNodeVisit = (node: Node) => {
        appendFileSync(file, setFn(node as Node, intfc, upperCaseFirstChar(node.name)));
    }
    walkAllNodes(zipper.next, onNodeVisit)
}

// export const getTypeCounts = (ast: NodeField[]) => {
//     const zipper = arrayZipper(ast);
//     const allTypes: string[] = [];
//     const onNodeVisit = (node: Node) => allTypes.push(node.type);
//     walkAllNodes(zipper.next, onNodeVisit);
//     return allTypes.reduce((acc, type) => {
//         acc[type] === undefined ? (acc[type] = 1) : acc[type]++;
//         return acc;
//     }, {})
// }