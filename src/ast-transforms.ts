import { defmulti } from '@thi.ng/defmulti';
import { AST, Field, Prop, Tree, Interface } from './api';
import { isArrayType } from './utils';

const NESTED = 'nested';
const LEAF = 'leaf';

const buildLeafPaths = defmulti<AST | Field>(([ _name, _required, type ]: Prop, interfaces: object, enums: Set<string>, _path: Field[]) => {
    return interfaces[type] ? NESTED : LEAF;
})
buildLeafPaths.add(NESTED, ([ name, required, type ]: Prop, interfaces: object, enums: Set<string>, path: Field[]) => {
    const field = { name, type, isArray: isArrayType(type), path, required, isEnum: false };
    return [ field, interfaces[type].map(f => buildLeafPaths(f, interfaces, enums, path.concat(field))) ];
})
buildLeafPaths.add(LEAF, ([ name, required, type ]: Prop, _interfaces: object, enums: Set<string>, path: Field[]) => {
    return { name, type, required, isArray: isArrayType(type), isEnum: enums.has(type), path };
})

export const buildAst = (tree: Tree): AST[] => {
    const asts: AST[] = [];
    const intfcs = tree.reduce((acc, intfc) => {
        return (acc[intfc[0]] = intfc[1], acc);
    }, {})
    const enums = tree.reduce((acc, Field) => {
        if (Field[0] === 'enum') {
            acc.add(Field[1][0])
        }
        return acc;
    }, new Set())
    
    tree.forEach(([ name, props ]: Interface) => {
        const rootField = { name, type: name, path: [], isArray: false, isEnum: false, required: true }
        asts.push([ rootField, props.map(f => buildLeafPaths(f, intfcs, enums, [])) ]);
    })

    return asts;
}