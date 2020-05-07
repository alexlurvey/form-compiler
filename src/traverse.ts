import { arrayZipper, Location } from '@thi.ng/zipper';
import { appendFileSync } from 'fs';
import { AST, Node, NodeField } from './api';
import { getFn, setFn } from './templates';
import { isNode, noop, upperCaseFirstChar } from './utils'

// older strategy of building files copied here.

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

// const walkObjectNodes = (
//     zipper: Location<Node | AST | (Node | AST)[]>,
//     onNodeVisit: (node: Node, children: (Node | NodeField)[]) => void,
// ) => {
//     if (!zipper || !zipper.node)
//         return;

//     if (isObjectNode(zipper)) {
//         onNodeVisit(zipper.down.node as Node, zipper.down.next.node as NodeField[])
//         walkObjectNodes(zipper.down.next.down.rightmost.next, onNodeVisit);
//     } else {
//         walkObjectNodes(zipper.next, onNodeVisit)
//     }
// }

// const walkAllNodes = (zipper: Location<Node | AST | (Node | AST)[]>, onNode) => {
//     if (!zipper || !zipper.node)
//         return;

//     if (isNode(zipper.node))
//         onNode(zipper.node)

//     walkAllNodes(zipper.next, onNode)
// }

const walk = (
    zipper: Location<AST | Node | NodeField[] | (Node | NodeField[])[]>,//Location<Node | AST | (Node | AST)[]>,
    onNode: (node: Node) => void,
    onObjectNode: (node: Node, children: NodeField[]) => void = noop,
) => {
    if (!zipper || !zipper.node) {
        return;
    } else if (isNode(zipper.node as Node)) {
        // current node is a leaf node (primitive property in object)
        onNode(zipper.node as Node);
        walk(zipper.next, onNode, onObjectNode);
    } else if (isObjectNode(zipper as any)) {
        // current node is another object
        onObjectNode(zipper.down.node as Node, zipper.down.next.node as NodeField[]);
        // skip over current children and proceed to next node after array
        let rm = zipper.down.rightmost;
        while (rm.down) {
            rm = rm.down.rightmost;
        }
        walk(rm.next, onNode, onObjectNode);
    } else {
        // current node is the array of children for an object
        walk(zipper.next, onNode, onObjectNode);
    }
}

/**
 * Run a function for every node in an AST.
 * @param ast the AST to traverse
 * @param onNodeVisit function that's called for every node encountered
 */
export const effectOnNode = (ast: NodeField[], onNodeVisit: (node: Node) => void) => {
    const zip = arrayZipper(ast);
    walk(zip, onNodeVisit);
}

/**
 * Run a function for every object node in an AST.
 * @param ast the AST to traverse
 * @param onNodeVisit function that's called for every object node encountered
 */
export const effectOnObjectNode = (ast: NodeField[], onNodeVisit: (node: Node, children: NodeField[]) => void) => {
    const zip = arrayZipper(ast);
    walk(zip, noop, onNodeVisit);
}

/**
 * Traverse an AST and collect all the interface types used within it.
 * @param ast the AST to traverse
 * @param interfaceNames global list of interfaces
 */
export const importsForFile = (ast: NodeField[], interfaceNames: string[]): string[] => {
    const zip = arrayZipper(ast);
    const result: string[] = [];
    const onNodeVisit = (node: Node) => interfaceNames.indexOf(node.type) !== -1 && result.push(node.type);
    walk(zip.next, onNodeVisit);
    return Array.from(new Set(result));
}

/**
 * Traverse an AST and write setter functions for each property
 * @param ast the AST to traverse
 * @param file path of file to write to
 * @param intfc the type of the root object
 */
export const writeSimpleSettersToFile = (ast: NodeField[], file: string, intfc: string) => {
    const zip = arrayZipper(ast);
    const onNodeVisit = (node: Node) => {
        appendFileSync(file, getFn(node as Node, intfc, upperCaseFirstChar(node.name)));
        appendFileSync(file, setFn(node as Node, intfc, upperCaseFirstChar(node.name)));
    }
    walk(zip.next, onNodeVisit)
}

export const writeStreamsToFile = (ast: NodeField[], file: string) => {
    const zip = arrayZipper(ast);
    const onNodeVisit = (node: Node) => {
        appendFileSync(file, `\t${node.name}: stream<${node.type}>(),\n`);
    }
    const onObjectNode = (node: Node, children: NodeField[]) => {
        // console.log('found object node', node.name)
    }
    appendFileSync(file, 'export const streams = {\n');
    walk(zip, onNodeVisit, onObjectNode);
    appendFileSync(file, '};\n\n');
}