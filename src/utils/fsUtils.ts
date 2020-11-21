import * as glob from 'glob';
import { promisify } from 'util';
import {Uri} from 'coc.nvim';
import {hasRootWorkspace, getRootWorkspacePath} from '../salesforcedx-core/utils';
import {nls} from '../messages';
import {TestRunner} from '../salesforcedx-utils-vscode';
 
const globFiles = promisify(glob);


export async function findFiles(globPattern: string, ignore?: string): Promise<Uri[]> {
  const files = await globFiles(globPattern, { absolute: true, ignore: ignore! });
  return Promise.resolve(files.map((file) => Uri.parse(file)));
}



export function getTempFolder(): string {
  if (hasRootWorkspace()) {
    const apexDir = new TestRunner().getTempFolder(
      getRootWorkspacePath(),
      'apex'
    );
    return apexDir;
  } else {
    throw new Error(nls.localize('cannot_determine_workspace'));
  }
}

