// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';
import { TextDecoder, TextEncoder } from 'util';
import Client from '../sdk/client';
import { CreateProcessRequest, Language, Mode, Modify, Status } from '../sdk/model/model';
import { langFromFileExtension } from '../utils';

/**
 * Service to modify source code.
 */
class CodemakerService {

    private readonly defaultPollingInterval: number = 1000
    private readonly completionPollingInterval: number = 100

    private readonly client;

    constructor(private readonly token: string) {
        this.client = new Client(token);
    }

    /**
     * Generate documentation for given source files.
     *
     * @param path file or directory path.
     */
    public async generateDocumentation(path: vscode.Uri) {
        return this.walkFiles(path, this.getProcessor(Mode.document));
    }

    /**
     * Generate code for given source files.
     *
     * @param path file or directory path.
     */
    public async generateCode(path: vscode.Uri) {
        return this.walkFiles(path, this.getProcessor(Mode.code));
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
    public async replaceDocumentation(path: vscode.Uri) {
        return this.walkFiles(path, this.getProcessor(Mode.document, Modify.replace));
    }

    /**
     * Replace code for given source files.
     *
     * @param path file or directory path.
     */
    public async replaceCode(path: vscode.Uri) {
        return this.walkFiles(path, this.getProcessor(Mode.code, Modify.replace));
    }

    private getProcessor(mode: Mode, modify: Modify = Modify.none) {
        return async (filePath: vscode.Uri): Promise<void> => {

            // Save the underlying file if there are unpersisted changes
            const textDocument = await vscode.workspace.openTextDocument(filePath);
            if (textDocument.isDirty) {
                await textDocument.save();
            }

            const sourceEncoded = await vscode.workspace.fs.readFile(filePath);
            const source = new TextDecoder('utf-8').decode(sourceEncoded);
            const ext = langFromFileExtension(filePath.path);
            const request = this.createProcessRequest(mode, ext, source, modify);
            return this.process(request)
                .then(async (output) => {
                    await vscode.workspace.fs.writeFile(filePath, new TextEncoder().encode(output));
                });
        };
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

    private async process(request: CreateProcessRequest, pollingInterval = this.defaultPollingInterval) {
        const processTask = await this.client.createProcess(request);

        const taskId = processTask.data.id;
        let status = Status.inProgress;
        let success = false;

        const timeout = Date.now() + 10 * 60 * 1000;
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

    private createProcessRequest(mode: Mode, lang: Language, source: string, modify: Modify) {
        return {
            process: {
                mode: mode,
                language: lang,
                input: {
                    source: source,
                },
                options: {
                    modify: modify,
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