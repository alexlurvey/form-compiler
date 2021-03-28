import { defmulti } from '@thi.ng/defmulti';
import { AST, ASTItem, Field, Prop, Interface, IObjectOf } from './api';
import { isArrayType, typeOfArray } from './utils';

const NESTED = 'nested';
const LEAF = 'leaf';

export const processProperty = defmulti<ASTItem>(([_, __, type]: Prop, interfaces: IObjectOf<Prop[]>, _enums: Set<string>, _path: Field[]) => {
    return interfaces[type] ? NESTED : LEAF;
})
processProperty.add(NESTED, ([ name, required, type ]: Prop, interfaces: IObjectOf<Prop[]>, enums: Set<string>, path: Field[]) => {
    const field = { name, type, isArray: isArrayType(type), path, required, isEnum: false, isInterface: true, intfc: interfaces[type] };
    return [ field, interfaces[type].map((prop: Prop) => processProperty(prop, interfaces, enums, path.concat(field))) ];
})
processProperty.add(LEAF, ([ name, required, type ]: Prop, interfaces: IObjectOf<Prop[]>, enums: Set<string>, path: Field[]) => {
    const isArray = isArrayType(type);
    const t = isArray ? typeOfArray(type) : type;
    const isInterface = !!interfaces[t];
    return { name, type: t, required, isArray, isInterface, isEnum: enums.has(t), intfc: interfaces[t], path };
})

export const buildAst = ([ name, props ]: Interface, interfaces: IObjectOf<Prop[]>, enums: Set<string>): AST => {
    const rootField: Field = { name, type: name, path: [], isArray: false, isEnum: false, required: true, isInterface: true, intfc: interfaces[name] };
    return [ rootField, props.map((prop: Prop) => processProperty(prop, interfaces, enums, [])) ];
};
