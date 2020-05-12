import { uppercaseFirstChar } from '../utils';

export const buildStreamObj = (properties: [ string, string ][]) => {
    let result = 'export const streams = {\n';
    properties.forEach(([ name, type ]) => {
        result += `\t${name}: stream<${type}>(),\n`
    })
    result += '};\n\n';
    return result;
}

export const buildStreamGetters = (streams: [ string, string ][]) => {
    let result: string[] = [];
    streams.forEach(([ name, type ]) => {
        const getter = `export function get${uppercaseFirstChar(name)} (): ${type} | undefined {
    return streams.${name}.deref();
}\n`;
        result.push(getter)
    });
    return result;
}

export const buildStreamSetters = (streams: [ string, string ][]) => {
    let result: string[] = [];
    streams.forEach(([ name, type ]) => {
        const setter = `export function set${uppercaseFirstChar(name)} (value: ${type}): void {
    streams.${name}.next(value);
}\n`;
        result.push(setter);
    })
    return result;
}

export const syncedStreams = (varName) =>
    `export const ${varName} = sync<any, any>({ src: streams });\n\n`;