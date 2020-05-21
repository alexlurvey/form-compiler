import { defmulti } from '@thi.ng/defmulti';
import { FileType } from '../api';
import { writeHooksFile, writeFieldArrayHooksFile } from './hooks';
import { writeIndexFile } from './index-files';
import { writePathFile } from './paths';
import { writeObjectStreamFile, writeArrayStreamFile } from './streams';

export const writeToFile = defmulti(ctx => ctx.fileType);
writeToFile.add(FileType.Paths, writePathFile)
writeToFile.add(FileType.Streams, writeObjectStreamFile)
writeToFile.add(FileType.Index, writeIndexFile)
writeToFile.add(FileType.Hooks, writeHooksFile)
writeToFile.add(FileType.ArrayStreams, writeArrayStreamFile)
writeToFile.add(FileType.ArrayHooks, writeFieldArrayHooksFile)