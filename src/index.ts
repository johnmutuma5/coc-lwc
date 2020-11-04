import {
  LanguageClient,
  LanguageClientOptions,
  workspace,
  ExtensionContext,
  ServerOptions,
  TransportKind,
  Uri
} from 'coc.nvim';
import * as path from 'path';
import { shared as lspCommon } from '@salesforce/lightning-lsp-common';
import {WorkspaceType} from '@salesforce/lightning-lsp-common/lib/shared';
import {Workspace} from 'coc.nvim/lib/workspace';

export async function activate(context: ExtensionContext) {
  try {
    checkWorkspaceFolders(workspace);
    checkLwcWorkspace();
  } catch(error) {
    console.error(`${error.name}: ${error.message}`);
    return;
  }

  console.info('LWC workspace detected. Starting LWC Server now!!');
  startLwcServer(context);
}

function checkWorkspaceFolders(workspace: Workspace): void {
  !(workspace.workspaceFolders?.length) &&
    workspace.workspaceFolders.push(workspace.workspaceFolder && workspace.workspaceFolder);

  if(!workspace.workspaceFolders?.length) {
    throw new Error('No workspaceFolders found');
  }
}

function checkLwcWorkspace(): void {
  const workspaceRoots: string[] = [];
  workspace.workspaceFolders.forEach(folder => {
    workspaceRoots.push(Uri.parse(folder.uri).fsPath);
  });
  const workspaceType: WorkspaceType = lspCommon.detectWorkspaceType(workspaceRoots);
  if(!lspCommon.isLWC(workspaceType)){
    console.log('Could not detect an LWC project structure. Exiting ...');
    throw new Error('No valid LWC workspace detected');
  }
}

function startLwcServer(context: ExtensionContext) {
  // Setup the language server
  const serverModule = context.asAbsolutePath(
    path.join(
      'node_modules',
      '@salesforce',
      'lwc-language-server',
      'lib',
      'server.js'
    )
  );


  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { language: 'html', scheme: 'file' },
      { language: 'javascript', scheme: 'file' }
    ],
    synchronize: {
      fileEvents: [
        workspace.createFileSystemWatcher('**/*.resource'),
        workspace.createFileSystemWatcher(
          '**/labels/CustomLabels.labels-meta.xml'
        ),
        workspace.createFileSystemWatcher(
          '**/staticresources/*.resource-meta.xml'
        ),
        workspace.createFileSystemWatcher('**/contentassets/*.asset-meta.xml'),
        workspace.createFileSystemWatcher('**/lwc/*/*.js'),
        workspace.createFileSystemWatcher('**/modules/*/*/*.js'),
        // need to watch for directory deletions as no events are created for contents or deleted directories
        workspace.createFileSystemWatcher('**/', false, true, false)
      ]
    }
  };

  // Create the language client and start the client.
  const client = new LanguageClient(
    'lwcLanguageServer',
    'LWC Language Server',
    serverOptions,
    clientOptions
  ).start();

  // Push the disposable to the context's subscriptions so that the
  // client can be deactivated on extension deactivation
  context.subscriptions.push(client);
}
