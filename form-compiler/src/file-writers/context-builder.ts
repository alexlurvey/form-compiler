import { transduce } from '@thi.ng/transducers';
import { AST, ASTItem, FileType, Field, IFileContext } from '../api';
import { buildPathsFileContext, buildStreamsFileContext, streamToHooksContext } from './context-object-builders';
import { fileContextReducer } from './reducers';
import { thingImports, reactImports } from '../templates';
import { isObjectNode, isArrayOfFields, isTuple, isPrimitive } from '../utils';
import { pathsXform, streamsXform, hooksXform } from '../xform';

export const buildFileContexts = (buildpath: string, schemaFilename: string, baseInterface: string | null = null) => {
    return (acc: IFileContext[], x: ASTItem) => {
        if (isObjectNode(x)) {
            const [ node, children ] = x as AST;
            const base = baseInterface || node.name;
            const levels = baseInterface
                ? node.path.map(q => q.name).concat(node.name)
                : [];

            const filepath = buildpath + '/' + base + `${levels.length ? '/' : ''}` + levels.join('/');
            const directoryLevel = levels.length + 1;

            const pathsLibraryImports = [ thingImports.paths(['mutIn, defGetter']) ];
            const pathsLocalImports = { [schemaFilename]: new Set([ base ]) };
            const pathsCtx = buildPathsFileContext(schemaFilename, node, filepath, directoryLevel, 
                pathsLibraryImports, pathsLocalImports);

            const streamsLibraryImports = [ thingImports.rstream(['CloseMode', 'ISubscribable', 'State', 'StreamSync', 'sync', 'stream']) ];
            const streamsCtx = buildStreamsFileContext(schemaFilename, node, filepath, directoryLevel, streamsLibraryImports);

            acc.push(transduce(pathsXform(schemaFilename), fileContextReducer(pathsCtx), children));
            acc.push(transduce(streamsXform(schemaFilename), fileContextReducer(streamsCtx), children));
            acc.push(transduce(hooksXform(schemaFilename), fileContextReducer(streamToHooksContext(streamsCtx)), children));
            acc.push(...children.reduce(buildFileContexts(buildpath, schemaFilename, base), []))
        } else if (isArrayOfFields(x)) {
            const node = x as Field;
            const base = baseInterface || node.name;
            const levels = baseInterface
                ? node.path.map(q => q.name).concat(node.name)
                : [];
            const filepath = buildpath + '/' + base + `${levels.length ? '/' : ''}` + levels.join('/');
            const directoryLevel = levels.length + 1;
            const streamsLibraryImports = [
                thingImports.rstream(['sync', 'stream', 'Stream', 'StreamSync', 'Subscription']),
                thingImports.transducers(['map']),
            ];
            const locals = node.intfc.filter(([_, __, type]) => !isTuple(type) && !isPrimitive(type)).map(([_, __, type]) => type);
            const localImports = {
                [schemaFilename]: new Set([ node.type, ...locals ]),
            }
            const streamsCtx = buildStreamsFileContext(schemaFilename, node, filepath, directoryLevel, streamsLibraryImports, localImports);
            streamsCtx.fileType = FileType.ArrayStreams;
            const hooksCtx = streamToHooksContext(streamsCtx);
            hooksCtx.localImports = {
                ...localImports,
                streams: new Set([ node.name, 'streams', 'syncedStreams' ]),
            }
            hooksCtx.libraryImports = [
                reactImports(['useEffect', 'useState']),
                thingImports.rstream(['Stream'])
            ];
            hooksCtx.fileType = FileType.ArrayHooks;
            acc.push(streamsCtx, hooksCtx);
        }
        return acc;
    }
}