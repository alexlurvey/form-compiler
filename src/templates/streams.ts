import { lowercaseFirstChar, uppercaseFirstChar } from '../utils';
import { Field, IStreamFileContext, Prop } from '../api';

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

// Array of fields templates
export const fieldArrayState = 'let nextId = 0;';
export const buildStreamsForFieldArray = (ctx: IStreamFileContext) => {
    const { type, name } = ctx.rootNode;
    return `let forceNext = stream<boolean>()
export let streams: { [key in keyof ${type}]: Stream<${type}[key]> }[] = []
export let syncedStreams: StreamSync<any, any>[] = []
const _${name} = sync<any, any>({ src: { forceNext }, mergeOnly: true, clean: true })
export const ${name}: Subscription<${type}[], ${type}[]> =
    _${name}.subscribe(map((q: { [key: string]: ${type} }) => {
        return Object.keys(q).reduce((acc: ${type}[], x: string) => {
            const idx = parseInt(x);
            if (!isNaN(idx)) {
                acc[idx] = q[x];
            }
            return acc;
        }, [])
    }))
    .subscribe(map((q: ${type}[]) => q.filter(x => !!x)))`;
}

export const buildNewStreamObjectFn = (ctx: IStreamFileContext) => {
    const { intfc, type, name } = ctx.rootNode;
    return `const new${type}Streams = (${name}: ${type}) => ({
${intfc.map(([n, _required, t]: Prop) => `\t${n}: stream<${t}>(s => s.next(${name}.${n})),\n`).join('')}})`;
}

export const buildAddFn = (ctx: IStreamFileContext) => {
    const { name, type } = ctx.rootNode;
    return `export function add (${name}: ${type}) {
    const newstreams = new${type}Streams(${name})
    const synced = sync<any, any>({ src: newstreams, id: \`\${nextId++}\`, mergeOnly: true, clean: true })
    streams.push(newstreams)
    syncedStreams.push(synced)
    _${name}.add(synced);
}`;
}

export const buildRemoveFn = (ctx: IStreamFileContext) => {
    const { type } = ctx.rootNode;
    return `export function remove (idx: number) {
    if (idx < 0 || idx >= streams.length) {
        throw Error(\`Cannot remove at \${idx} for ${type} of length \${streams.length}\`);
    }
    Object.keys(streams[idx]).forEach((key: string) => streams[idx][key as keyof ${type}].done())
    _communities.removeID(syncedStreams[idx].id)
    syncedStreams[idx].done()
    streams = streams.slice(0, idx).concat(streams.slice(idx+1, streams.length))
    syncedStreams = syncedStreams.slice(0, idx).concat(syncedStreams.slice(idx+1, syncedStreams.length))
    forceNext.next(true)
}`;
}

export const buildArrayOfFieldsInit = (ctx: IStreamFileContext) => {
    const { name, type } = ctx.rootNode;
    return `export function init${uppercaseFirstChar(name)} (value: ${type}[]) {
    value.forEach((val: ${type}) => add(val))
    nextId = value.length;
}`
}