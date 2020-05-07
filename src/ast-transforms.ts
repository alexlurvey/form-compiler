import { defmulti } from '@thi.ng/defmulti';
import { Reducer, Transducer, comp } from '@thi.ng/transducers';
import { AST, Tree, Field, Interface, Node, NodeField } from './api';
import { getFn, setFn, initialComment } from './templates';
import { isNode, isObjectNode, isArrayType, upperCaseFirstChar } from './utils';

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

const attachHeader: Transducer<NodeField, NodeField> =
    (rfn: Reducer<any, AST>): Reducer<any, NodeField> => {
        const reducer: Reducer<any, NodeField> = [
            () => rfn[0](),
            (acc) => rfn[1](acc),
            (acc, x: AST) => {
                return (acc.header = initialComment, rfn[2](acc, x))
            }
        ];
        return reducer;
    }

const buildLocalImports: Transducer<NodeField, NodeField> = (rfn) => {
    const reducer: Reducer<any, AST> = [
        () => rfn[0](),
        (acc) => rfn[1](acc),
        (acc, x: AST) => {
            if (isObjectNode(x)) {
                acc.localImports.add(x[0].type)
            }
            return rfn[2](acc, x);
        }
    ]
    return reducer;
}

const gatherSetters: Transducer<NodeField, NodeField> = (rfn) =>
    <Reducer<any, NodeField>>[
        () => rfn[0](),
        (acc) => rfn[1](acc),
        (acc, x: NodeField) => {
            if (isNode(x)) {
                acc.setters.push(setFn(x as Node, acc.baseInterface, upperCaseFirstChar((x as Node).name)));
            } else if (isObjectNode(x)) {
                const node: Node = x[0];
                acc.setters.push(setFn(node, acc.baseInterface, upperCaseFirstChar(node.name)))
            }
            return rfn[2](acc, x);
        }
    ];

const gatherGetters: Transducer<NodeField, NodeField> = (rfn) =>
    <Reducer<any, NodeField>>[
        () => rfn[0](),
        (acc) => rfn[1](acc),
        (acc, x: NodeField) => {
            if (isNode(x)) {
                acc.getters.push(getFn(x as Node, acc.baseInterface, upperCaseFirstChar((x as Node).name)))
            } else if (isObjectNode(x)) {
                const node: Node = x[0];
                acc.getters.push(getFn(node, acc.baseInterface, upperCaseFirstChar(node.name)))
            }
            return rfn[2](acc, x);
        }
    ]

const gatherStreams: Transducer<NodeField, NodeField> = (rfn) =>
    <Reducer<any, NodeField>>[
        () => rfn[0](),
        (acc) => rfn[1](acc),
        (acc, x) => {
            if (isNode(x)) {
                acc.streams.push([(x as Node).name, (x as Node).type])
            }
            return rfn[2](acc, x);
        }
    ]

export const pathsXform = comp(
    attachHeader,
    buildLocalImports,
    gatherSetters,
    gatherGetters,
)

export const streamsXform = comp(
    attachHeader,
    buildLocalImports,
    gatherStreams,
)