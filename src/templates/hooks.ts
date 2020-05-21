import { Field, IHooksFileContext } from '../api';
import { typeOfArray, uppercaseFirstChar, isTuple, isArrayType } from '../utils';

const primitiveDefaults = {
    string: '',
    boolean: false,
    number: 0,
}

const typeForField = ({ type, isArray }: Field) => `${type}${isArray ? '[]' : ''}`;

const buildTupleDefaultValue = (type: string) => {
    return type.slice(1, type.length-1).split(',')
        .filter(q => q.length)
        .map(q => isArrayType(q.trim()) ? [] : primitiveDefaults[q.trim()]);
}

export const IArrayOps = `interface IArrayOps<T> {
    pop(): void;
    push(value: T): void;
    removeAt(idx: number): void;
    shift(): void;
    unshift(value: T): void;
}\n\n`

export const hookFromStream = (field: Field) => {
    const { name, type, isEnum } = field
    const defaultVal = isTuple(type)
        ? JSON.stringify(buildTupleDefaultValue(type))
        : JSON.stringify(primitiveDefaults[type]);
    const t = isEnum ? `(${typeForField(field)} | undefined)` : typeForField(field);
    const fn = `export const use${uppercaseFirstChar(name)} = (): [ ${t}, (x: ${type}) => void ] => {\n`;
    const state = `\tconst [ value, setValue ] = useState<${t}>(() => streams.${name}.deref() || ${defaultVal});\n\n`;
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

export const hookFromArrayStream = (field: Field) => {
    const { name, type } = field;
    const t = typeForField(field)
    const fn = `export const use${uppercaseFirstChar(name)} = (): [ ${t}, (x: ${t}) => void, IArrayOps<${typeOfArray(type)}> ] => {\n`;
    const state = `\tconst [ value, setValue ] = useState<${t}>(() => streams.${name}.deref() || []);\n\n`;
    const fx = `\tuseEffect(() => {
        const sub = streams.${name}.subscribe(sideEffect((val: ${t}) => setValue(val)));
        return () => sub.done();
    }, [])\n\n`;
    const cb = `\tconst setter = useCallback((val: ${t}) => {
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

// field array hooks
export const hookForFieldArray = (ctx: IHooksFileContext) => {
    const { name, type } = ctx.rootNode;
    return `export const use${uppercaseFirstChar(name)} = (): ${type}[] => {
    const [ value, setValue ] = useState<${type}[]>(() => ${name}.deref() || [])

    useEffect(() => {
        const sub = ${name}.subscribe(sideEffect((val: ${type}[]) => setValue(val)))
        return () => sub.done()
    }, [])

    return value;
}`
}

export const hookForFieldArrayIds = (ctx: IHooksFileContext) => {
    const { name, type } = ctx.rootNode;
    return `export const use${uppercaseFirstChar(name)}Ids = <T>(getId: (value: ${type}) => T) => {
    const [ ids, setIds ] = useState<T[]>(() => {
        const current = ${name}.deref();
        return current ? current.map(getId) : [];
    })

    useEffect(() => {
        const sub = ${name}.subscribe(sideEffect((q: ${type}[]) => {
            if (q.length !== ids.length) {
                setIds(q.map(getId))
            }
        }))
        return () => sub.done()
    }, [ids, setIds])

    return ids;
}`
}

export const hookForIndividualField = (ctx: IHooksFileContext) => {
    const { type, intfc } = ctx.rootNode;
    return `const buildSetters = (streams: { [key in keyof ${type} ]: Stream<any> }) => {
    return {${intfc.map(([name, _req, type]) => `\n\t\tset${uppercaseFirstChar(name)} (value: ${type}) {
            streams.${name}.next(value)
        }`).join(',')}
    }
}

export const use${uppercaseFirstChar(type)}At = (index: number) => {
    const [ item, setItem ] = useState<${type}>(() => {
        return syncedStreams[index].deref();
    })

    const [ callbacks, _ ] = useState<{ [key: string]: any }>(() => {
        return buildSetters(streams[index]);
    })

    useEffect(() => {
        const sub = syncedStreams[index].subscribe(sideEffect((q: ${type}) => {
            setItem(q)
        }))
        return () => sub.done()
    }, [setItem])

    return [ item, callbacks ]
}`
}

