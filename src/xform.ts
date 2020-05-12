import { Reducer, Transducer, comp, filter } from '@thi.ng/transducers';
import { getFn, setFn, initialComment } from './templates';
import { AST, Node, ASTItem, IFileContext, IIndexFileContext, IStreamFileContext } from './api';
import { isNode, isObjectNode, uppercaseFirstChar, isStreamFileContext, isEnum } from './utils';

export const pathsXform = (schemaFilename: string) =>
    comp(
        attachHeader,
        buildSchemaImports(schemaFilename),
        gatherSetters,
        gatherGetters,
    )

export const streamsXform = (schemaFilename: string) => 
    comp(
        attachHeader,
        buildSchemaImports(schemaFilename),
        gatherStreams,
    )

export const indexXform = (currentCtx: IStreamFileContext) =>
    comp(
        withStreamFiles,
        withDirectChildDirectories(currentCtx),
        gatherImports,
        gatherStreamObjectProps,
    )

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
                const set = acc.localImports[schemaFilename] || new Set<string>();
                acc.localImports[schemaFilename] = set.add((x as Node).type);
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