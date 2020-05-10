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

// const typeAndName = collect(seq([
//     WS0,
//     discard(maybe(string('export'))),
//     WS0,
//     join(typeName),
//     WS1,
//     join(typeName),
// ]))
// xform(typeAndName, $ => ($.result = { type: $.result[0], name: $.result[1] }, $)),

const t = oneOrMore(alt([
    ALPHA_NUM,
    WS1,
    oneOf('<>[]?,'),
]))
// const content = join(oneOrMore(alt([
//     ALPHA_NUM,
//     WS1,
//     oneOf('\'"[]<>()|:,')
// ])))
const field = collect(seq([
    WS0,
    join(oneOrMore(ALPHA_NUM)),
    WS0,
    discard(lit(':')),
    WS0,
    join(t),
    discard(maybe(oneOf(',;'))),
    WS0,
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
    // content, // TODO: handle types that are just types (not fields)
    discard(maybe(oneOf('};')))
]))

export const program = collect(zeroOrMore(alt([ typ, intfc ])))