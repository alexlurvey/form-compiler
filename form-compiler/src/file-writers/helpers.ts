import { IFileContext } from '../api';
import { importStatement } from '../templates';

export const getLocalImportStatements = (ctx: IFileContext) => {
    return Object.keys(ctx.localImports).map(key => {
        if (key === ctx.schemaFilename) {
            return importStatement(Array.from(ctx.localImports[key]), key, ctx.directoryLevel)
        } else {
            return importStatement(Array.from(ctx.localImports[key]), key)
        }   
    });
}