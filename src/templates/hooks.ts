import { typeOfArray, uppercaseFirstChar } from '../utils';

const primitiveDefaults = {
    string: '',
    boolean: false,
    number: 0,
}

export const IArrayOps = `interface IArrayOps<T> {
    pop(): void;
    push(value: T): void;
    removeAt(idx: number): void;
    shift(): void;
    unshift(value: T): void;
}\n\n`

export const hookFromStream = ([ name, type ]: [string, string]) => {
    const defaultVal = JSON.stringify(primitiveDefaults[type]);
    const fn = `export const use${uppercaseFirstChar(name)} = (): [ ${type}, (x: ${type}) => void ] => {\n`;
    const state = `\tconst [ value, setValue ] = useState<${type}>(() => streams.${name}.deref() || ${defaultVal});\n\n`;
    const fx = `\tuseEffect(() => {
        const sub = streams.${name}.subscribe(sideEffect((val: ${type}) => setValue(val)));
        return () => sub.done();
    }, [])\n\n`;
    const cb = `\tconst setter = useCallback((val: ${type}) => {
        set${uppercaseFirstChar(name)}(val);
    }, [])\n\n`;
    const ret = `\treturn [ value, setter ];\n`;
    return `${fn}${state}${fx}${cb}${ret}}`;
}

export const hookFromArrayStream = ([name, type]: [string, string]) => {
    const fn = `export const use${uppercaseFirstChar(name)} = (): [ ${type}, (x: ${type}) => void, IArrayOps<${typeOfArray(type)}> ] => {\n`;
    const state = `\tconst [ value, setValue ] = useState<${type}>(() => streams.${name}.deref() || []);\n\n`;
    const fx = `\tuseEffect(() => {
        const sub = streams.${name}.subscribe(sideEffect((val: ${type}) => setValue(val)));
        return () => sub.done();
    }, [])\n\n`;
    const cb = `\tconst setter = useCallback((val: ${type}) => {
        set${uppercaseFirstChar(name)}(val);
    }, [])\n\n`;
    const arrayOps = buildArrayOps([name, type]);
    const ret = `\treturn [ value, setter, { push, pop, removeAt, shift, unshift } ];\n`;
    return `${fn}${state}${fx}${cb}${arrayOps}${ret}}`;
}

export const buildArrayOps = (stream: [string, string]) => {
    return `\tconst push = ${pushCallback(stream)}
    const pop = ${popCallback(stream)}
    const removeAt = ${removeAtCallback(stream)}
    const shift = ${shiftCallback(stream)}
    const unshift = ${unshiftCallback(stream)}\n`
}

// array ops for hooks
export const pushCallback = ([ name, type ]: [string, string]) => {
    return `useCallback((value: ${typeOfArray(type)}) => {
        const current = streams.${name}.deref() || [];
        set${uppercaseFirstChar(name)}(current.concat(value));
    }, [])`;
}

export const popCallback = ([name, _type]: [string, string]) => {
    return `useCallback(() => {
        const current = streams.${name}.deref() || [];
        set${uppercaseFirstChar(name)}((current.pop(), current));
    }, [])`;
}

export const shiftCallback = ([name, _type]: [string, string]) => {
    return `useCallback(() => {
        const current = streams.${name}.deref() || [];
        set${uppercaseFirstChar(name)}((current.shift(), current));
    }, [])`
}

export const unshiftCallback = ([name, type]: [string, string]) => {
    return `useCallback((value: ${typeOfArray(type)}) => {
        const current = streams.${name}.deref() || [];
        set${uppercaseFirstChar(name)}((current.unshift(value), current));
    }, [])`
}

export const removeAtCallback = ([name, _type]: [string, string]) => {
    return `useCallback((idx: number) => {
        const current = streams.${name}.deref() || [];
        set${uppercaseFirstChar(name)}(current.slice(0, idx).concat(current.slice(idx+1)));
    }, [])`
}