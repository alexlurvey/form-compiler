import { defmulti } from '@thi.ng/defmulti';
import { AST, Field, Prop, Interface, IObjectOf } from './api';
import { isArrayType, typeOfArray } from './utils';

const NESTED = 'nested';
const LEAF = 'leaf';

const buildLeafPaths = defmulti<AST | Field>(([ _name, _required, type ]: Prop, interfaces: object, enums: Set<string>, _path: Field[]) => {
    return interfaces[type] ? NESTED : LEAF;
})
buildLeafPaths.add(NESTED, ([ name, required, type ]: Prop, interfaces: object, enums: Set<string>, path: Field[]) => {
    const field = { name, type, isArray: isArrayType(type), path, required, isEnum: false, isInterface: true, intfc: interfaces[type] };
    return [ field, interfaces[type].map(f => buildLeafPaths(f, interfaces, enums, path.concat(field))) ];
})
buildLeafPaths.add(LEAF, ([ name, required, type ]: Prop, interfaces: object, enums: Set<string>, path: Field[]) => {
    const isArray = isArrayType(type);
    const t = isArray ? typeOfArray(type) : type;
    const isInterface = !!interfaces[t];
    return { name, type: t, required, isArray, isInterface, isEnum: enums.has(t), intfc: interfaces[t], path };
})

export const buildAst = (intfc: Interface, allInterfaces: IObjectOf<Prop[]>, allEnums: Set<string>): AST => {
    const [ name, fields ] = intfc;
    const rootField: Field = { name, type: name, path: [], isArray: false, isEnum: false, required: true, isInterface: true, intfc: allInterfaces[name] }
    return [ rootField, fields.map(f => buildLeafPaths(f, allInterfaces, allEnums, [])) ];
}