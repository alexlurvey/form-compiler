import { lowercaseFirstChar, uppercaseFirstChar } from '../utils';
import { Field } from '../api';

const typeForField = ({ type, isArray }: Field) => `${type}${isArray ? '[]' : ''}`;

export const buildStreamObj = (streams: Field[]) => {
    let result = `export const streams = {\n`;
    streams.forEach(field => {
        const id = field.path.map(f => f.name).concat(field.name).join('.');
        result += `\t${field.name}: stream<${typeForField(field)}>({ id: '${id}', closeOut: CloseMode.NEVER }),\n`
    })
    result += '};';
    return result;
}

export const buildStreamGetters = (streams: Field[]) => {
    let result: string[] = [];
    streams.forEach(field => {
        const getter = `export function get${uppercaseFirstChar(field.name)} (): ${typeForField(field)} | undefined {
    return streams.${field.name}.deref();\n}`;
        result.push(getter)
    });
    return result;
}

export const buildStreamSetters = (streams: Field[]) => {
    let result: string[] = [];
    streams.forEach((field) => {
        const setter = `export function set${uppercaseFirstChar(field.name)} (value: ${typeForField(field)}): void {
    streams.${field.name}.next(value);\n}`;
        result.push(setter);
    })
    return result;
}

export const buildStreamRemovers = (streams: Field[], rootNode: Field) => {
    let result: string[] = [];
    streams.forEach(({ name }) => {
        const fn = `export function remove${uppercaseFirstChar(name)} (): void {
    ${lowercaseFirstChar(rootNode.name)}.removeID(streams.${name}.id);\n}`
        result.push(fn);
    })
    return result;
}

export const buidlStreamAdders = (streams: Field[], rootNode: Field) => {
    let result: string[] = [];
    streams.forEach(field => {
        const fn = `export function add${uppercaseFirstChar(field.name)} (value: ${typeForField(field)}): void {
    streams.${field.name}.next(value);
    ${lowercaseFirstChar(rootNode.name)}.add(streams.${field.name});\n}`;
        result.push(fn)
    })
    return result;
}

export const buildDescendantStreamAdders = (streams: Field[], rootNode: Field) => {
    let result: string[] = [];
    streams.forEach(field => {
        const fn = `export function add${uppercaseFirstChar(field.name)} (value: ${typeForField(field)}): void {
    if (!${field.name} || ${field.name}.getState() !== State.ACTIVE) {
        init${uppercaseFirstChar(field.name)}(value)
    }
    ${lowercaseFirstChar(rootNode.name)}.add(${field.name})\n}`;

        result.push(fn);
    })
    return result;
}

export const buildDescendantStreamRemovers = (streams: Field[], rootNode: Field) => {
    let result: string[] = [];
    streams.forEach(({ name }) => {
        const fn = `export function remove${uppercaseFirstChar(name)} (): void {\n\t${lowercaseFirstChar(rootNode.name)}.removeID(${name}.id)\n}`
        result.push(fn);
    })
    return result;
}

export const buildInitFunc = (rootNode: Field, streams: Field[], descendantStreams: Field[]) => {
    return `export function init${uppercaseFirstChar(rootNode.name)} (value: ${rootNode.type}): void {
    const src: { [key: string ]: ISubscribable<any> } = { ...streams };
${descendantStreams.map((f: Field) => `\tif (value['${f.name}']) {\n\t\tinit${uppercaseFirstChar(f.name)}(value.${f.name});\n\t\tsrc['${f.name}'] = ${f.name};\n\t}`).join('\n')}
    ${lowercaseFirstChar(rootNode.name)} = sync<any, ${rootNode.type}>({ src, id: '${lowercaseFirstChar(rootNode.name)}', mergeOnly: true, clean: true });
${streams.map(({ name }) => `\tstreams.${name}.next(value.${name});`).join('\n')}
}`
}

export const buildRemoveFunc = (rootNode: Field) => {
    return `export function remove${uppercaseFirstChar(rootNode.name)} (): void {
    ${lowercaseFirstChar(rootNode.name)}.unsubscribe();
}`;
}