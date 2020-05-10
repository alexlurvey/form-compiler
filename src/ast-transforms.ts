import { defmulti } from '@thi.ng/defmulti';
import { Reducer, Transducer, comp, filter } from '@thi.ng/transducers';
import { AST, Tree, Field, Interface, Node, NodeField, IFileContext, IIndexFileContext, IStreamFileContext } from './api';
import { getFn, setFn, initialComment } from './templates';
import { isNode, isObjectNode, isArrayType, uppercaseFirstChar, isStreamFileContext, isEnum } from './utils';

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

// AST Transducers
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
        (acc, x: AST | Node) => {
            if (isObjectNode(x)) {
                acc.localImports.add(x[0].type)
            } else if (isEnum(x)) {
                acc.localImports.add((x as Node).type)
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
                acc.setters.push(setFn(x as Node, acc.baseInterface, uppercaseFirstChar((x as Node).name)));
            } else if (isObjectNode(x)) {
                const node: Node = x[0];
                acc.setters.push(setFn(node, acc.baseInterface, uppercaseFirstChar(node.name)))
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
                acc.getters.push(getFn(x as Node, acc.baseInterface, uppercaseFirstChar((x as Node).name)))
            } else if (isObjectNode(x)) {
                const node: Node = x[0];
                acc.getters.push(getFn(node, acc.baseInterface, uppercaseFirstChar(node.name)))
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

// File Context Transducers
export const withStreamFiles = filter((q: IFileContext) => isStreamFileContext(q))

export const withDirectChildDirectories = (current: IFileContext) =>
    filter((q: IFileContext) =>
        q.filepath.startsWith(current.filepath) && q.directoryLevel - 1 === current.directoryLevel);

export const gatherImports: Transducer<IFileContext, IFileContext> = (rfn) =>
    <Reducer<any, IFileContext>>[
        () => rfn[0](),
        (acc) => rfn[1](acc),
        (acc: IIndexFileContext, x: IFileContext) => {
            const parts = x.filepath.split('/');
            const objName = parts[parts.length - 1];
            const i = `import { ${objName} } from './${objName}/streams';\n`;
            acc.imports.push(i);
            return rfn[2](acc, x);
        }
    ]
export const gatherStreamObjectProps: Transducer<IFileContext, IFileContext> = (rfn) =>
    <Reducer<any, IFileContext>>[
        () => rfn[0](),
        (acc) => rfn[1](acc),
        (acc: IIndexFileContext, x: IFileContext) => {
            const objectName = x.filepath.split('/').pop();
            if (x.directoryLevel === 1) {
                acc.rootObjectProps.push(`\t...${objectName},\n`);
            } else {
                acc.rootObjectProps.push(`\t${objectName},\n`);
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

export const indexXform = (currentCtx: IStreamFileContext) => comp(
    withStreamFiles,
    withDirectChildDirectories(currentCtx),
    gatherImports,
    gatherStreamObjectProps,
)