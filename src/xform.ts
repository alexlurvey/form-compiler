import { Reducer, Transducer, comp } from '@thi.ng/transducers';
import { getFn, setFn, initialComment } from './templates';
import { AST, Field, ASTItem, IStreamFileContext, IPathFileContext } from './api';
import { isField, isObjectNode, uppercaseFirstChar, isEnum, isArrayType } from './utils';

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

const withRequiredInterfaceImports = (schemaFilename: string): Transducer<ASTItem, ASTItem> => (rfn) =>
    <Reducer<any, ASTItem>>[
        () => rfn[0](),
        (acc) => rfn[1](acc),
        (acc, x: AST | Field) => {
            if (isObjectNode(x)) {
                const { type } = x[0];
                const set = acc.localImports[schemaFilename] || new Set<string>();
                acc.localImports[schemaFilename] = set.add(type);
            }
            return rfn[2](acc, x);
        }
    ]

const withRequiredEnumImports = (schemaFilename: string): Transducer<ASTItem, ASTItem> => (rfn) =>
    <Reducer<any, ASTItem>>[
        () => rfn[0](),
        (acc) => rfn[1](acc),
        (acc, x: AST | Field) => {
            if (isEnum(x)) {
                const set = acc.localImports[schemaFilename] || new Set<string>();
                acc.localImports[schemaFilename] = set.add((x as Field).type);
            }
            return rfn[2](acc, x);
        }
    ]

const gatherSetters: Transducer<ASTItem, ASTItem> = (rfn) =>
    <Reducer<any, ASTItem>>[
        () => rfn[0](),
        (acc) => rfn[1](acc),
        (acc: IPathFileContext, x: ASTItem) => {
            if (isField(x)) {
                acc.setters.push(setFn(x as Field, acc.rootNode.type, uppercaseFirstChar((x as Field).name)));
            } else if (isObjectNode(x)) {
                const node: Field = x[0];
                acc.setters.push(setFn(node, acc.rootNode.type, uppercaseFirstChar(node.name)))
            }
            return rfn[2](acc, x);
        }
    ];

const gatherGetters: Transducer<ASTItem, ASTItem> = (rfn) =>
    <Reducer<any, ASTItem>>[
        () => rfn[0](),
        (acc) => rfn[1](acc),
        (acc: IPathFileContext, x: ASTItem) => {
            if (isField(x)) {
                acc.getters.push(getFn(x as Field, acc.rootNode.type, uppercaseFirstChar((x as Field).name)))
            } else if (isObjectNode(x)) {
                const node: Field = x[0];
                acc.getters.push(getFn(node, acc.rootNode.type, uppercaseFirstChar(node.name)))
            }
            return rfn[2](acc, x);
        }
    ]

const gatherStreams: Transducer<ASTItem, ASTItem> = (rfn) =>
    <Reducer<any, ASTItem>>[
        () => rfn[0](),
        (acc) => rfn[1](acc),
        (acc: IStreamFileContext, x) => {
            if (isField(x)) {
                acc.streams.push(x as Field)
            }
            return rfn[2](acc, x);
        }
    ]

const gatherDescendentStreamData: Transducer<ASTItem, ASTItem> = (rfn) =>
    <Reducer<any, ASTItem>>[
        () => rfn[0](),
        (acc) => rfn[1](acc),
        (acc: IStreamFileContext, x) => {
            if (isObjectNode(x)) {
                const [ node, _ ] = x as [ Field, any[]];
                const path = `${node.name}/streams`;
                const set = acc.localImports[path] || new Set();
                acc.localImports[path] = set.add(node.name);
                acc.rootObjectProps.push(`\t${node.name},\n`);
            }
            return rfn[2](acc, x);
        }
    ]

export const pathsXform = (schemaFilename: string) =>
    comp(
        attachHeader,
        withRequiredInterfaceImports(schemaFilename),
        withRequiredEnumImports(schemaFilename),
        gatherSetters,
        gatherGetters,
    )

export const streamsXform = (schemaFilename: string) => 
    comp(
        attachHeader,
        withRequiredEnumImports(schemaFilename),
        gatherStreams,
        gatherDescendentStreamData,
    )

export const hooksXform = (schemaFilename: string) =>
    comp(
        attachHeader,
        withRequiredEnumImports(schemaFilename),
    )
