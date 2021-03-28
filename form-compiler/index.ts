import { defContext } from '@thi.ng/parse';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmdirSync } from 'fs';
import * as path from 'path';
import { Enum, FileType, Interface, Tree, IObjectOf, Prop } from './src/api';
import { buildAst } from './src/ast-transforms';
import { buildFileContexts, writeToFile } from './src/file-writers';
import { program } from './src/parser';

const WORK_DIR = process.env.PWD!;

const inputfile = process.argv.length > 2 && process.argv[2];
if (!inputfile) {
    console.error('Need a TypeScript file as first argument');
    process.exit(1);
}

const inputfilePath = path.resolve(WORK_DIR, inputfile);
if (!existsSync(inputfilePath)) {
    console.error(`${inputfile} doesn't exist`);
    process.exit(1);
}

let tmpIdx;
const outdir = (tmpIdx = process.argv.indexOf('--out-dir'), tmpIdx === -1 ? 'build' : process.argv[tmpIdx+1]);
const rootInterface = (tmpIdx = process.argv.indexOf('--interface'), tmpIdx === -1 ? 'Form' : process.argv[tmpIdx+1]);

const [ schemaFilename, extension ] = inputfile.split('/').pop()?.split('.') ?? [];
const buildPath = path.resolve(WORK_DIR, outdir);

const schema = readFileSync(inputfilePath, { encoding: 'utf-8' });
const ctx = defContext(schema, { debug: false });
program(ctx);
const parseResult: Tree = ctx.result;

const allInterfaces: IObjectOf<Prop[]> = parseResult.reduce((acc, intfc: Interface) => {
    if (intfc[0] === 'enum') {
        return acc;
    }
    return (acc[intfc[0]] = intfc[1], acc);
}, {})

const allEnums: Set<string> = parseResult.reduce((acc, field: Enum) => {
    if (field[0] === 'enum') {
        acc.add(field[1])
    }
    return acc;
}, new Set<string>())
const formInterface: Interface = [ rootInterface, allInterfaces[rootInterface] ];
const ast = buildAst(formInterface, allInterfaces, allEnums);

const contexts = [ast].reduce(buildFileContexts(buildPath, schemaFilename), []); // TODO: rework buildFileContexts to not be a reducing fn
const indexCtxs = Array.from(new Set(contexts.map(q => q.filepath)))
    .map(filepath => ({ filepath, filename: FileType.Index, fileType: FileType.Index }));

rmdirSync(path.join(buildPath, rootInterface), { recursive: true });
mkdirSync(buildPath, { recursive: true });
[ ...contexts, ...indexCtxs ].forEach(ctx => writeToFile(ctx))

copyFileSync(inputfilePath, buildPath + '/' + rootInterface + '/' + schemaFilename + '.' + extension);
