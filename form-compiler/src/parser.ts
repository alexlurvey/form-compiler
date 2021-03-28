import {
    oneOf,
    zeroOrMore,
    lit,
    alt,
    collect,
    oneOrMore,
    seq,
    string,
    join,
    WS0,
    WS1,
    ALPHA_NUM,
    maybe,
    xform,
    stringD,
    litD,
    oneOfD,
} from '@thi.ng/parse';

const typeName = oneOrMore(alt([
    ALPHA_NUM,
    oneOf('<>'),
]))

const t = oneOrMore(alt([
    ALPHA_NUM,
    WS1,
    oneOf('<>[]?,'), // TODO: handle type/interfaces that use commas at the end of line instead of ;
]))
const enumT = oneOrMore(alt([
    ALPHA_NUM,
    oneOf('-<>[]\'?"'), // TODO: expand options
]))
const field = collect(seq([
    WS0,
    join(oneOrMore(ALPHA_NUM)),
    WS0,
    xform(maybe(lit('?')), $ => ($!.result = $?.result !== '?', $)),
    WS0,
    litD(':'),
    WS0,
    join(t),
    oneOfD(',;'),
    WS0,
]))

const enumField = collect(seq([
    WS0,
    join(oneOrMore(ALPHA_NUM)),
    WS0,
    litD('='),
    WS0,
    join(enumT), // TODO: expand options
    litD(','),
]))

const intfc = collect(seq([
    WS0,
    stringD('export'),
    WS0,
    stringD('interface'),
    WS1,
    join(typeName),
    WS1,
    litD('{'),
    collect(zeroOrMore(field)),
    litD('}'),
]))

const typ = collect(seq([
    WS0,
    stringD('export'),
    WS0,
    stringD('type'),
    WS1,
    join(typeName),
    WS0,
    litD('='),
    WS0,
    litD('{'),
    collect(zeroOrMore(field)),
    oneOfD('};')
]))

const enm = collect(seq([
    WS0,
    stringD('export'),
    WS0,
    string('enum'),
    WS1,
    join(typeName),
    WS0,
    litD('{'),
    collect(zeroOrMore(enumField)),
    WS0,
    litD('}'),
]))

export const program = collect(zeroOrMore(alt([ typ, intfc, enm ])))