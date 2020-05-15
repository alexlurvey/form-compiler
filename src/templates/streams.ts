import { lowercaseFirstChar, uppercaseFirstChar } from '../utils';
import { Field } from '../api';

export const buildStreamObj = (streams: Field[]) => {
    let result = `export const streams = {\n`;
    streams.forEach(({ name, type, path }) => {
        const id = path.map(f => f.name).concat(name).join('.');
        result += `\t${name}: stream<${type}>({ id: '${id}', closeOut: CloseMode.NEVER }),\n`
    })
    result += '};';
    return result;
}

export const buildStreamGetters = (streams: Field[]) => {
    let result: string[] = [];
    streams.forEach(({ name, type }) => {
        const getter = `export function get${uppercaseFirstChar(name)} (): ${type} | undefined {
    return streams.${name}.deref();\n}`;
        result.push(getter)
    });
    return result;
}

export const buildStreamSetters = (streams: Field[]) => {
    let result: string[] = [];
    streams.forEach(({ name, type }) => {
        const setter = `export function set${uppercaseFirstChar(name)} (value: ${type}): void {
    streams.${name}.next(value);\n}`;
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

export const buidlStreamAdders = (streams: Field[], rootNode: Field, descendantStreams: Field[]) => {
    let result: string[] = [];
    streams.forEach(({ name, type, path }) => {
        const id = path.map(f => f.name).concat(name).join('.');
        const fn = `export function add${uppercaseFirstChar(name)} (value: ${type}): void {
    streams.${name}.next(value);
    ${lowercaseFirstChar(rootNode.name)}.add(streams.${name});\n}`;
        result.push(fn)
    })
    return result;
}

export const buildDescendantStreamAdders = (streams: Field[], rootNode: Field) => {
    let result: string[] = [];
    streams.forEach(({ name, type }) => {
        const fn = `export function add${uppercaseFirstChar(name)} (value: ${type}): void {
    if (!${name} || ${name}.getState() !== State.ACTIVE) {
        init${uppercaseFirstChar(name)}(value)
    }
    ${lowercaseFirstChar(rootNode.name)}.add(${name})\n}`;

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