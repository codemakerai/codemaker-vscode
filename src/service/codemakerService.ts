// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';
import { TextDecoder, TextEncoder } from 'util';
import { Client, CreateProcessRequest, Language, Mode, Modify, Status } from 'codemaker-sdk';
import { Configuration } from '../configuration/configuration';
import { langFromFileExtension } from '../utils/languageUtils';

/**
 * Service to modify source code.
 */
class CodemakerService {

    private readonly taskTimeoutInMilliseconds: number = 10 * 60 * 1000
    private readonly defaultPollingInterval: number = 500
    private readonly completionPollingInterval: number = 100

    private readonly client;

    constructor() {
        this.client = new Client(() => Configuration.apiKey());
    }

    /**
     * Generate code for given source files.
     *
     * @param path file or directory path.
     */
    public async generateCode(path: vscode.Uri) {
        return this.walkFiles(path, this.getFileProcessor(Mode.code));
    }

    /**
     * Generate inline code for given source files.
     *
     * @param path file or directory path.
     */
    public async generateInlineCode(path: vscode.Uri, codePath: string) {
        return this.walkFiles(path, this.getFileProcessor(Mode.inlineCode, Modify.none, codePath));
    }

    /**
     * Generate documentation for given source files.
     *
     * @param path file or directory path.
     */
    public async generateDocumentation(path: vscode.Uri) {
        return this.walkFiles(path, this.getFileProcessor(Mode.document));
    }

    /**
     * Triggers predictive code generation for given source files.
     *
     * @param path file or directory path.
     */
    public async predictiveGeneration(path: vscode.Uri) {
        return this.walkFiles(path, this.getPredictiveProcessor(Mode.code));
    }

    /**
     * Complete comment for given line comment
     * 
     * @param source source file
     * @param lang language
     * @param offset offset of current cursor
     */
    public async complete(source: string, lang: Language, offset: number) {
        const request = this.createCompletionProcessRequest(lang, source, offset);
        return this.process(request, this.completionPollingInterval);
    }

    /**
     * Replace documentation for given source files.
     *
     * @param path file or directory path.
     */
    public async replaceDocumentation(path: vscode.Uri, codePath?: string) {
        return this.walkFiles(path, this.getFileProcessor(Mode.document, Modify.replace, codePath));
    }

    /**
     * Replace code for given source files.
     *
     * @param path file or directory path.
     */
    public async replaceCode(path: vscode.Uri, codePath?: string) {
        return this.walkFiles(path, this.getFileProcessor(Mode.code, Modify.replace, codePath));
    }

    private getPredictiveProcessor(mode: Mode, modify: Modify = Modify.none, codePath?: string) {
        return async (filePath: vscode.Uri): Promise<void> => {
            const source = await this.readFile(filePath);
            const lang = langFromFileExtension(filePath.path);
            const request = this.createProcessRequest(mode, lang, source, modify, codePath);
            this.predictiveProcess(request);
        }
    }

    private getFileProcessor(mode: Mode, modify: Modify = Modify.none, codePath?: string) {
        return async (filePath: vscode.Uri): Promise<void> => {
            const source = await this.readFile(filePath);
            const lang = langFromFileExtension(filePath.path);
            const request = this.createProcessRequest(mode, lang, source, modify, codePath);
            return this.process(request).then(async (output) => {
                await vscode.workspace.fs.writeFile(filePath, new TextEncoder().encode(output));
            });
        }
    }

    private async walkFiles(root: vscode.Uri, processor: (filePath: vscode.Uri) => Promise<void>) {
        const type = await vscode.workspace.fs.stat(root);
        if(type.type === vscode.FileType.File) {
            return await processor(root);
        }
        for (const [name, type] of await vscode.workspace.fs.readDirectory(root)) {
            if (type === vscode.FileType.File) {
                await processor(vscode.Uri.joinPath(root, name));
            } else if (type === vscode.FileType.Directory) {
                await this.walkFiles(vscode.Uri.joinPath(root, name), processor);
            } else {
                console.error('Unsupported file type');
            }
        }
    }

    private async predictiveProcess(request: CreateProcessRequest, pollingInterval = this.defaultPollingInterval) {
        await this.client.createProcess(request);
    }

    private async process(request: CreateProcessRequest, pollingInterval = this.defaultPollingInterval) {
        const processTask = await this.client.createProcess(request);

        const taskId = processTask.data.id;
        let status = Status.inProgress;
        let success = false;

        const timeout = Date.now() + this.taskTimeoutInMilliseconds;
        while (status === Status.inProgress && timeout > Date.now()) {
            const processStatus = await this.client.getProcessStatus(this.createProcessStatusRequest(taskId));
            status = processStatus.data.status;
            if (processStatus.data.status === Status.completed) {
                success = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, pollingInterval));
        }

        if (!success) {
            throw Error('Processing task had failed');
        }

        const processOutput = await this.client.getProcessOutput(this.createProcessOutputRequest(taskId));
        return processOutput.data.output.source;
    }

    private async readFile(filePath: vscode.Uri) {
        // Save the underlying file if there are unpersisted changes
        const textDocument = await vscode.workspace.openTextDocument(filePath);
        if (textDocument.isDirty) {
            await textDocument.save();
        }

        const sourceEncoded = await vscode.workspace.fs.readFile(filePath);
        return new TextDecoder('utf-8').decode(sourceEncoded);
    }

    private createProcessRequest(mode: Mode, lang: Language, source: string, modify: Modify, codePath?: string) {
        return {
            process: {
                mode: mode,
                language: lang,
                input: {
                    source: source,
                },
                options: {
                    modify: modify,
                    codePath: codePath
                },
            }
        };
    }

    private createCompletionProcessRequest(lang: Language, source: string, offset: number) {
        return {
            process: {
                mode: Mode.completion,
                language: lang,
                input: {
                    source: source,
                },
                options: {
                    codePath: '@' + offset
                }
            }
        };
    }

    private createProcessStatusRequest(taskId: string) {
        return {
            id: taskId,
        };
    }

    private createProcessOutputRequest(taskId: string) {
        return {
            id: taskId,
        };
    }
}

export default CodemakerService;