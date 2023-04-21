// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as fs from 'fs';
import * as path from 'path';
import Client from '../sdk/Client';
import {Language, Mode, Status} from '../sdk/model/Model';

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
    public async generateDocumentation(path: string) {
        return this.walkFiles(path, (filePath: string): Promise<void> => {
            const source = fs.readFileSync(filePath, 'utf8');
            const ext = this.langFromFileExtension(filePath);
            if (!ext) {
                return Promise.resolve();
            }
            return this.process(Mode.document, ext, source)
                .then((output) => {
                    fs.writeFileSync(filePath, output);
                });
        });
    }

    /**
     * Generate code for given source files.
     *
     * @param path file or directory path.
     */
    public async generateCode(path: string) {
        return this.walkFiles(path, (filePath: string): Promise<void> => {
            const source = fs.readFileSync(filePath, 'utf8');
            const ext = this.langFromFileExtension(filePath);
            if (!ext) {
                return Promise.resolve();
            }
            return this.process(Mode.code, ext, source)
                .then((output) => {
                    fs.writeFileSync(filePath, output);
                });
        });
    }

    private async walkFiles(root: string, processor: (filePath: string) => Promise<void>) {
        if (fs.statSync(root).isFile()) {
            return await processor(root);
        }
        for (const file of fs.readdirSync(root)) {
            const filePath = path.join(root, file);
            const stats = fs.statSync(filePath);
            if (fs.statSync(filePath).isFile()) {
                await processor(filePath);
            } else if (stats.isDirectory()) {
                await this.walkFiles(filePath, processor);
            }
        }
    }

    // TODO: add error handling
    private async process(mode: Mode, lang: Language, source: string) {
        const processTask = await this.client.createProcess(this.createProcessRequest(mode, lang, source));

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

    private createProcessRequest(mode: Mode, lang: Language, source: string) {
        return {
            process: {
                mode: mode,
                language: lang,
                input: {
                    source: source,
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
            id: taskId
        };
    }

    // TODO move to config file
    private langFromFileExtension(fileName: string): Language | null {
        const ext = fileName.split('.').pop();
        if (ext === 'java') {
            return Language.java;
        }
        console.info("unsupported language: " + ext);
        return null;
    }
}

export default CodemakerService;