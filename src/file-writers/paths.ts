import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { IPathFileContext } from '../api';
import { importStatement } from '../templates';

export const writePathFile = (ctx: IPathFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    const localImports: string[] = Object.keys(ctx.localImports)
        .map(key => importStatement(Array.from(ctx.localImports[key]), key, ctx.directoryLevel));
    const imports = [ ...ctx.libraryImports, ...localImports ];
    (!existsSync(ctx.filepath) && mkdirSync(ctx.filepath, { recursive: true }))
    appendFileSync(fullpath, ctx.header);
    appendFileSync(fullpath, imports.join('\n').concat('\n\n'));
    appendFileSync(fullpath, ctx.setters.join(''))
    appendFileSync(fullpath, ctx.getters.join(''))
}