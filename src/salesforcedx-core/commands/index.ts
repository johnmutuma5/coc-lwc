import {ContinueResponse, ParametersGatherer, PreconditionChecker, CommandExecution, CliCommandExecutor} from "../../salesforcedx-utils-vscode";
import { EmptyPostChecker } from './utils';
import { Event } from 'coc.nvim';
import {notificationService} from "../notifications";
import {getRootWorkspacePath} from "../utils";
import {CancellationTokenSource, CancellationToken} from "vscode-languageserver-protocol";
import {channelService} from "../channels";
import {Command, SfdxCommandBuilder} from "../../salesforcedx-utils-vscode/src/cli/commandBuilder";
import {getTempFolder} from "../../utils/fsUtils";

export interface CommandletExecutor<T> {
  execute(response: ContinueResponse<T>): void;
  readonly onDidFinishExecution?: Event<[number, number]>;
}
export abstract class SfdxCommandletExecutor<T> implements CommandletExecutor<T> {
  protected showChannelOutput = true;
  protected executionCwd = getRootWorkspacePath();
  // protected onDidFinishExecutionEventEmitter = Event<
  //   [number, number]
  // >();
  // public readonly onDidFinishExecution: Event<[number, number]> = this
  //   .onDidFinishExecutionEventEmitter.event;

  protected attachExecution(
    execution: CommandExecution,
    cancellationTokenSource: CancellationTokenSource,
    cancellationToken: CancellationToken
  ) {
    channelService.streamCommandOutput(execution);

    if (this.showChannelOutput) {
      channelService.showChannelOutput();
    }

    // notificationService.reportCommandExecutionStatus(
    //   execution,
    //   cancellationToken
    // );
    // ProgressNotification.show(execution, cancellationTokenSource);
    // taskViewService.addCommandExecution(execution, cancellationTokenSource);
  }

  // public logMetric(
  //   logName: string | undefined,
  //   hrstart: [number, number],
  //   properties?: Properties,
  //   measurements?: Measurements
  // ) {
  //   telemetryService.sendCommandEvent(
  //     logName,
  //     hrstart,
  //     properties,
  //     measurements
  //   );
  // }

  public execute(response: ContinueResponse<T>): void {
    const startTime = process.hrtime();
    const cancellationTokenSource = new CancellationTokenSource();
    const cancellationToken = cancellationTokenSource.token;
    const execution = new CliCommandExecutor(this.build(response.data), {
      cwd: this.executionCwd,
      env: { SFDX_JSON_TO_STDOUT: 'true' }
    }).execute(cancellationToken);

    // let output = '';
    // execution.stdoutSubject.subscribe(realData => {
    //   output += realData.toString();
    // });

    // execution.processExitSubject.subscribe(exitCode => {
    //   const telemetryData = this.getTelemetryData(
    //     exitCode === 0,
    //     response,
    //     output
    //   );
    //   let properties;
    //   let measurements;
    //   if (telemetryData) {
    //     properties = telemetryData.properties;
    //     measurements = telemetryData.measurements;
    //   }
    //   this.logMetric(
    //     execution.command.logName,
    //     startTime,
    //     properties,
    //     measurements
    //   );
    //   this.onDidFinishExecutionEventEmitter.fire(startTime);
    // });
    this.attachExecution(execution, cancellationTokenSource, cancellationToken);
  }

  // protected getTelemetryData(
  //   success: boolean,
  //   response: ContinueResponse<T>,
  //   output: string
  // ): TelemetryData | undefined {
  //   return;
  // }

  public abstract build(data: T): Command;
}

export abstract class SfdxApexTestCommandletExecutor<T> extends SfdxCommandletExecutor<T> {

  public build(data: T): Command {
    const testMethodName =  this.getTestName(data);
    const outputToJson = getTempFolder();
    return new SfdxCommandBuilder()
      .withDescription('Running Unit Tests for: ' + testMethodName)
      .withArg('force:apex:test:run')
      .withFlag('--tests', testMethodName)
      .withFlag('--resultformat', 'human')
      .withFlag('--outputdir', outputToJson)
      .withFlag('--loglevel', 'error')
      .withLogName('force_apex_test_run_code_action')
      .build()
  }
  public abstract getTestName(data: T): string;
}

export class SfdxCommandlet<T> {
  public readonly onDidFinishExecution?: Event<[number, number]>;

  constructor(
    private readonly prechecker: PreconditionChecker,
    private readonly gatherer: ParametersGatherer<T>,
    private readonly executor: CommandletExecutor<T>,
    private readonly postchecker = new EmptyPostChecker()
  ) {
    if (this.executor.onDidFinishExecution) {
      this.onDidFinishExecution = this.executor.onDidFinishExecution;
    }
  }

  public async run(): Promise<void> {
    if (await this.prechecker.check()) {
      let inputs = await this.gatherer.gather();
      inputs = await this.postchecker.check(inputs);
      switch (inputs.type) {
        case 'CONTINUE':
          return this.executor.execute(inputs);
        case 'CANCEL':
          if (inputs.msg) {
            notificationService.showErrorMessage(inputs.msg);
          }
          return;
      }
    }
  }
}
