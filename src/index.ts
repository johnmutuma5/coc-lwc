import { workspace, ExtensionContext, LanguageClient, commands } from 'coc.nvim';
import setupLwcServerClient from './client';
import {checkLwcWorkspace, checkWorkspaceFolders} from './utils';
import createLwcComponent from './commands/createLwcComponent';

export async function activate(context: ExtensionContext) {
  try {
    checkWorkspaceFolders(workspace);
    checkLwcWorkspace();
  } catch(error) {
    console.error(`${error.name}: ${error.message}`);
    return;
  }

  console.info('LWC workspace detected. Starting LWC Server now!!');
  const client: LanguageClient = setupLwcServerClient(context);
  client.onReady().then(() => console.info('Success!! LWC client ready'));
  // Push the disposable to the context's subscriptions so that the
  // client can be deactivated on extension deactivation
  context.subscriptions.push(

    commands.registerCommand('SFDX.Create.LWC.Component', createLwcComponent),
    client.start()
  );
}
