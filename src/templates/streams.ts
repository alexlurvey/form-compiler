import { lowercaseFirstChar, uppercaseFirstChar } from '../utils';
import { Field } from '../api';

export const buildStreamObj = (streams: Field[]) => {
    let result = `export const streams = {\n`;
    streams.forEach(({ name, type }) => {
        result += `\t${name}: stream<${type}>(),\n`
    })
    result += '};\n\n';
    return result;
}

export const buildStreamGetters = (streams: Field[]) => {
    let result: string[] = [];
    streams.forEach(({ name, type }) => {
        const getter = `export function get${uppercaseFirstChar(name)} (): ${type} | undefined {
    return streams.${name}.deref();
}\n`;
        result.push(getter)
    });
    return result;
}

export const buildStreamSetters = (streams: Field[]) => {
    let result: string[] = [];
    streams.forEach(({ name, type }) => {
        const setter = `export function set${uppercaseFirstChar(name)} (value: ${type}): void {
    streams.${name}.next(value);
}\n`;
        result.push(setter);
    })
    return result;
}

export const syncedStreams = (rootNode: Field) =>
    `export const ${lowercaseFirstChar(rootNode.name)} = sync<${rootNode.type}, ${rootNode.type}>({ src, mergeOnly: true });`;

export const rootObjectSources = (rootNode: Field, rootObjectProps) =>
`\nconst src: ${uppercaseFirstChar(rootNode.name)}Sources = {\n\t...streams,\n${rootObjectProps.join('')}};`;

export const syncedSourceType = (rootNode: Field): string =>
    `type ${uppercaseFirstChar(rootNode.name)}Sources = {\n\t[key in keyof ${rootNode.type}]: ISubscribable<any>\n}`;