import { defmulti } from '@thi.ng/defmulti';
import { AST, Field, Prop, Tree, Interface, Enum } from './api';
import { isArrayType, typeOfArray } from './utils';

const NESTED = 'nested';
const LEAF = 'leaf';

const buildLeafPaths = defmulti<AST | Field>(([ _name, _required, type ]: Prop, interfaces: object, enums: Set<string>, _path: Field[]) => {
    return interfaces[type] ? NESTED : LEAF;
})
buildLeafPaths.add(NESTED, ([ name, required, type ]: Prop, interfaces: object, enums: Set<string>, path: Field[]) => {
    const field = { name, type, isArray: isArrayType(type), path, required, isEnum: false, isInterface: true };
    return [ field, interfaces[type].map(f => buildLeafPaths(f, interfaces, enums, path.concat(field))) ];
})
buildLeafPaths.add(LEAF, ([ name, required, type ]: Prop, interfaces: object, enums: Set<string>, path: Field[]) => {
    const isArray = isArrayType(type);
    const t = isArray ? typeOfArray(type) : type;
    const isInterface = !!interfaces[t];
    return { name, type: t, required, isArray, isInterface, isEnum: enums.has(t), path };
})

export const buildAst = (tree: Tree): AST[] => {
    const asts: AST[] = [];
    const intfcs = tree.reduce((acc, intfc) => {
        if (intfc[0] === 'enum') {
            return acc;
        }
        return (acc[intfc[0]] = intfc[1], acc);
    }, {})
    const enums = tree.reduce((acc, field: Enum) => {
        if (field[0] === 'enum') {
            acc.add(field[1])
        }
        return acc;
    }, new Set())
    
    tree.forEach(([ name, props ]: Interface) => {
        if (name !== 'enum') {
            const rootField = { name, type: name, path: [], isArray: false, isEnum: false, required: true, isInterface: true }
            asts.push([ rootField, props.map(f => buildLeafPaths(f, intfcs, enums, [])) ]);
        }
    })

    return asts;
}