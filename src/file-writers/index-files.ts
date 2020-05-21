import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { IIndexFileContext } from '../api';
import { indexFileContent } from '../templates';

export const writeIndexFile = (ctx: IIndexFileContext) => {
    const fullpath = `${ctx.filepath}/${ctx.filename}`;
    (!existsSync(ctx.filepath) && mkdirSync(ctx.filepath, { recursive: true }))
    appendFileSync(fullpath, indexFileContent);
}
