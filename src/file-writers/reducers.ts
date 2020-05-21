import { defmulti, DEFAULT } from '@thi.ng/defmulti';
import { reducer, Reducer } from '@thi.ng/transducers';
import { AST, FileType, IFileContext, IStreamFileContext } from '../api'
import { isStreamFileContext } from '../utils';

const defaultReducer = (init: IFileContext) => reducer(() => init, (acc, _) => acc);
const streamReducer = (init: IStreamFileContext) => {
    return reducer(() => init, (acc, _x) => {
        if (isStreamFileContext(acc)) {
            // add root node type to local imports
            const set = acc.localImports[acc.schemaFilename] || new Set();
            acc.localImports[acc.schemaFilename] = set.add(acc.rootNode.type);
        }
        return acc;
    })
}

export const fileContextReducer = defmulti<IFileContext, Reducer<IFileContext, AST>>(ctx => ctx.filename);
fileContextReducer.add(FileType.Streams, streamReducer);
fileContextReducer.add(DEFAULT, defaultReducer)