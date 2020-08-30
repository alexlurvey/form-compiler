import { defmulti } from '@thi.ng/defmulti';
import { AST, Field, Prop, Interface, IObjectOf } from './api';
import { isArrayType, typeOfArray } from './utils';

const ROOT = 'root';
const NESTED = 'nested';
const LEAF = 'leaf';

export const buildAst = defmulti<AST | Field>((propOrInterface: Prop | Interface, interfaces: IObjectOf<Prop[]>, enums: Set<string>, _path: Field[]) => {
    if (Array.isArray(propOrInterface) && Array.isArray(propOrInterface[1])) {
        return ROOT;
    }
    const [ _, __, type ] = propOrInterface;
    return interfaces[type] ? NESTED : LEAF;
})
buildAst.add(ROOT, ([ name, props ]: Interface, interfaces: IObjectOf<Prop[]>, enums: Set<string>, _path: Field[]) => {
    const rootField: Field = { name, type: name, path: [], isArray: false, isEnum: false, required: true, isInterface: true, intfc: interfaces[name] };
    return [ rootField, props.map(f => buildAst(f, interfaces, enums, [])) ];
})
buildAst.add(NESTED, ([ name, required, type ]: Prop, interfaces: object, enums: Set<string>, path: Field[]) => {
    const field = { name, type, isArray: isArrayType(type), path, required, isEnum: false, isInterface: true, intfc: interfaces[type] };
    return [ field, interfaces[type].map(f => buildAst(f, interfaces, enums, path.concat(field))) ];
})
buildAst.add(LEAF, ([ name, required, type ]: Prop, interfaces: object, enums: Set<string>, path: Field[]) => {
    const isArray = isArrayType(type);
    const t = isArray ? typeOfArray(type) : type;
    const isInterface = !!interfaces[t];
    return { name, type: t, required, isArray, isInterface, isEnum: enums.has(t), intfc: interfaces[t], path };
})
