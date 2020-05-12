import { defmulti } from '@thi.ng/defmulti';
import { Reducer, Transducer, comp, filter } from '@thi.ng/transducers';
import { AST, Tree, Field, Interface, Node, ASTItem, IFileContext, IIndexFileContext, IStreamFileContext } from './api';
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
const attachHeader: Transducer<ASTItem, ASTItem> =
    (rfn: Reducer<any, AST>): Reducer<any, ASTItem> => {
        const reducer: Reducer<any, ASTItem> = [
            () => rfn[0](),
            (acc) => rfn[1](acc),
            (acc, x: AST) => {
                return (acc.header = initialComment, rfn[2](acc, x))
            }
        ];
        return reducer;
    }

const buildSchemaImports = (schemaFilename: string): Transducer<ASTItem, ASTItem> => (rfn) => {
    const reducer: Reducer<any, AST> = [
        () => rfn[0](),
        (acc) => rfn[1](acc),
        (acc, x: AST | Node) => {
            if (isObjectNode(x)) {
                const { type } = x[0];
                const set = acc.localImports[schemaFilename] || new Set<string>();
                acc.localImports[schemaFilename] = set.add(type);
            } else if (isEnum(x)) {
                const { type } = x as Node;
                const set = acc.localImports[schemaFilename] || new Set<string>();
                acc.localImports[schemaFilename] = set.add(type);
            }
            return rfn[2](acc, x);
        }
    ]
    return reducer;
}

const gatherSetters: Transducer<ASTItem, ASTItem> = (rfn) =>
    <Reducer<any, ASTItem>>[
        () => rfn[0](),
        (acc) => rfn[1](acc),
        (acc, x: ASTItem) => {
            if (isNode(x)) {
                acc.setters.push(setFn(x as Node, acc.baseInterface, uppercaseFirstChar((x as Node).name)));
            } else if (isObjectNode(x)) {
                const node: Node = x[0];
                acc.setters.push(setFn(node, acc.baseInterface, uppercaseFirstChar(node.name)))
            }
            return rfn[2](acc, x);
        }
    ];

const gatherGetters: Transducer<ASTItem, ASTItem> = (rfn) =>
    <Reducer<any, ASTItem>>[
        () => rfn[0](),
        (acc) => rfn[1](acc),
        (acc, x: ASTItem) => {
            if (isNode(x)) {
                acc.getters.push(getFn(x as Node, acc.baseInterface, uppercaseFirstChar((x as Node).name)))
            } else if (isObjectNode(x)) {
                const node: Node = x[0];
                acc.getters.push(getFn(node, acc.baseInterface, uppercaseFirstChar(node.name)))
            }
            return rfn[2](acc, x);
        }
    ]

const gatherStreams: Transducer<ASTItem, ASTItem> = (rfn) =>
    <Reducer<any, ASTItem>>[
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
            const filepath = `${objName}/streams`;
            const set = acc.localImports[filepath] || new Set();
            acc.localImports[filepath] = set.add(objName);
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

export const pathsXform = (schemaFilename: string) => comp(
    attachHeader,
    buildSchemaImports(schemaFilename),
    gatherSetters,
    gatherGetters,
)

export const streamsXform = (schemaFilename: string) => comp(
    attachHeader,
    buildSchemaImports(schemaFilename),
    gatherStreams,
)

export const indexXform = (currentCtx: IStreamFileContext) => comp(
    withStreamFiles,
    withDirectChildDirectories(currentCtx),
    gatherImports,
    gatherStreamObjectProps,
)