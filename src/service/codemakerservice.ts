// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';
import { TextDecoder, TextEncoder } from 'util';
import Client from '../sdk/Client';
import {Language, Mode, Modify, Status} from '../sdk/model/Model';
import { UnsupportedLanguageError } from '../sdk/Errors';

/**
 * Service to modify source code.
 */
class CodemakerService {

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
            const ext = this.langFromFileExtension(filePath);
            return this.process(mode, ext, source, modify)
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

    // TODO: add error handling
    private async process(mode: Mode, lang: Language, source: string, modify: Modify) {
        const processTask = await this.client.createProcess(this.createProcessRequest(mode, lang, source, modify));

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
            await new Promise(resolve => setTimeout(resolve, 1000));
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

    // TODO move to config file
    private langFromFileExtension(fileName: vscode.Uri): Language {
        const ext = fileName.path.split('.').pop();
        switch (ext) {
            case 'java':
                return Language.java;
            case 'js':
            case 'jsx':
                return Language.javascript;
            case 'kt':
                return Language.kotlin;
            case 'go':
                return Language.go;    
            default:
                console.info("unsupported language: " + ext);
                throw new UnsupportedLanguageError(ext);
        }
    }
}

export default CodemakerService;