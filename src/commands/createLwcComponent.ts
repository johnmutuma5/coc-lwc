import {SfdxWorkspaceChecker} from "../salesforcedx-core/commands/utils";
import {SfdxCommandlet} from "../salesforcedx-core";
import {ParametersGatherer, CancelResponse, ContinueResponse} from "../salesforcedx-utils-vscode";
import {SfdxCommandletExecutor} from "../salesforcedx-core/commands";
import {Command, SfdxCommandBuilder} from "../salesforcedx-utils-vscode/src/cli/commandBuilder";
import {workspace} from "coc.nvim";
import {NEW_COMPONENT_INPUT_TITLE, NEW_COMPONENT_OUTPUT_DIR_TITLE, DEFAULT_LWC_DIR} from "../utils/constants";

interface CreateComponentData {
  name: string,
  dir: string
}

class CreateComponentGatherer implements ParametersGatherer<CreateComponentData> {
  public async gather(): Promise<CancelResponse | ContinueResponse<CreateComponentData>> {
    const componentName = await workspace.requestInput(NEW_COMPONENT_INPUT_TITLE);

    if(!componentName) {
      return {
        type: 'CANCEL'
      }
    } else {
      const componentDir = await workspace.requestInput(NEW_COMPONENT_OUTPUT_DIR_TITLE, DEFAULT_LWC_DIR);
      return {
        type: 'CONTINUE',
        data: {
          name: componentName,
          dir: componentDir
        }
      }
    };
  }
}

class CreateComponentExecutor extends SfdxCommandletExecutor<CreateComponentData> {
  public build(data: CreateComponentData): Command {
    return new SfdxCommandBuilder()
      .withDescription(`Creating LWC Component: ${data.name}`)
      .withArg('force:lightning:component:create')
      .withFlag('--type', 'lwc')
      .withFlag('--componentname', data.name)
      .withFlag('--outputdir', data.dir)
      .withFlag('--loglevel', 'error')
      .build();
  }
}

const workspaceChecker = new SfdxWorkspaceChecker();
const parameterGatherer = new CreateComponentGatherer();

export default function createLwcComponent() {
  const commandlet = new SfdxCommandlet(
    workspaceChecker,
    parameterGatherer,
    new CreateComponentExecutor(),
  );
  commandlet.run();
}
