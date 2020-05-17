import {
    discard,
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
    xform(maybe(lit('?')), $ => ($.result = $.result !== '?', $)),
    WS0,
    discard(lit(':')),
    WS0,
    join(t),
    discard(maybe(oneOf(',;'))),
    WS0,
]))

const enumField = collect(seq([
    WS0,
    join(oneOrMore(ALPHA_NUM)),
    WS0,
    discard(lit('=')),
    WS0,
    join(enumT), // TODO: expand options
    discard(lit(',')),
]))

const intfc = collect(seq([
    WS0,
    discard(maybe(string('export'))),
    WS0,
    discard(string('interface')),
    WS1,
    join(typeName),
    WS1,
    discard(lit('{')),
    collect(zeroOrMore(field)),
    discard(lit('}')),
]))

const typ = collect(seq([
    WS0,
    discard(maybe(string('export'))),
    WS0,
    discard(string('type')),
    WS1,
    join(typeName),
    WS0,
    discard(lit('=')),
    WS0,
    discard(maybe(lit('{'))),
    collect(zeroOrMore(field)),
    discard(maybe(oneOf('};')))
]))

const enm = collect(seq([
    WS0,
    discard(maybe(string('export'))),
    WS0,
    string('enum'),
    WS1,
    join(typeName),
    WS0,
    discard(lit('{')),
    collect(zeroOrMore(enumField)),
    WS0,
    discard(lit('}')),
]))

export const program = collect(zeroOrMore(alt([ typ, intfc, enm ])))