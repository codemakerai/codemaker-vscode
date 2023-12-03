// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { TextDecoder, TextEncoder } from 'util';
import { Client, ProcessRequest, CompletionRequest, PredictRequest, Language, Mode, Modify, DiscoverContextRequest, CreateContextRequest, RegisterContextRequest, SourceContext } from 'codemaker-sdk';
import { Configuration } from '../configuration/configuration';
import { langFromFileExtension } from '../utils/languageUtils';
import { CodeSnippetContext } from 'codemaker-sdk';

/**
 * Service to modify source code.
 */
class CodemakerService {

    private readonly client;

    private readonly decoder;

    constructor() {
        this.client = new Client(() => Configuration.apiKey());
        this.decoder = new TextDecoder('utf-8');
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
     * Generate source graph code for given source files.
     *
     * @param path file or directory path.
     */
    public async generateSourceGraphCode(path: vscode.Uri, depth: number = 0) {
        return this.walkFiles(path, this.getSourceGraphFileProcessor(Mode.code, depth));
    }

    /**
     * Generate inline code for given source files.
     *
     * @param path file or directory path.
     */
    public async generateInlineCode(path: vscode.Uri, codePath: string) {
        return this.walkFiles(path, this.getFileProcessor(Mode.inlineCode, 0, Modify.none, codePath));
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
        return this.walkFiles(path, this.getPredictiveProcessor());
    }

    /**
     * Complete comment for given line comment
     * 
     * @param source source file
     * @param lang language
     * @param offset offset of current cursor
     */
    public async complete(filePath: vscode.Uri, source: string, lang: Language, offset: number, allowMultiLineAutocomplete: boolean, codeSnippetContexts: CodeSnippetContext[]) {
        const codePath = `@${offset}`;
        const contextId = await this.registerContext(lang, source, filePath);
        const request = this.createCompletionProcessRequest(lang, source, codePath, allowMultiLineAutocomplete, codeSnippetContexts, contextId);
        return this.completion(request);
    }

    /**
     * Replace documentation for given source files.
     *
     * @param path file or directory path.
     */
    public async replaceDocumentation(path: vscode.Uri, codePath?: string) {
        return this.walkFiles(path, this.getFileProcessor(Mode.document, 0, Modify.replace, codePath));
    }

    /**
     * Replace code for given source files.
     *
     * @param path file or directory path.
     */
    public async replaceCode(path: vscode.Uri, codePath?: string) {
        return this.walkFiles(path, this.getFileProcessor(Mode.code, 0, Modify.replace, codePath));
    }

    /**
     * Fixes code syntax for given source files.
     *
     * @param path file or directory path.
     */
    public async fixSyntax(path: vscode.Uri, codePath?: string) {
        return this.walkFiles(path, this.getFileProcessor(Mode.fixSyntax, 0, Modify.replace, codePath));
    }

    /**
     * Edits code.
     *
     * @param path file or directory path.
     */
    public async editCode(path: vscode.Uri, codePath?: string, prompt?: string) {
        return this.walkFiles(path, this.getFileProcessor(Mode.editCode, 0, Modify.replace, codePath, prompt));
    }

    private getPredictiveProcessor() {
        return async (filePath: vscode.Uri): Promise<void> => {
            const source = await this.readFile(filePath);
            const lang = langFromFileExtension(filePath.path);

            const contextId = await this.registerContext(lang, source, filePath);

            const request = this.createPredictRequest(lang, source, contextId);
            this.predictiveProcess(request);
        };
    }

    private getFileProcessor(mode: Mode, depth: number = 0, modify: Modify = Modify.none, codePath?: string, prompt?: string) {
        return async (filePath: vscode.Uri): Promise<void> => {
            const source = await this.readFile(filePath);
            const lang = langFromFileExtension(filePath.path);

            const contextId = await this.registerContext(lang, source, filePath);

            const request = this.createProcessRequest(mode, lang, source, modify, codePath, prompt, contextId);
            return this.process(request).then(async (output) => {
                await vscode.workspace.fs.writeFile(filePath, new TextEncoder().encode(output));
            });
        };
    }

    private getSourceGraphFileProcessor(mode: Mode, depth: number = 0) {
        return async (filePath: vscode.Uri): Promise<void> => {
            const source = await this.readFile(filePath);
            const lang = langFromFileExtension(filePath.path);

            const paths: vscode.Uri[] = await this.discoverContext(filePath, lang, source);
            if (depth < 1) {
                for (let path of paths) {
                    await this.generateSourceGraphCode(path, depth + 1);
                }
            }

            const contextId = await this.registerContext(lang, source, filePath, Mode.code);

            const request = this.createProcessRequest(mode, lang, source, Modify.none, undefined, contextId);
            return this.process(request).then(async (output) => {
                await vscode.workspace.fs.writeFile(filePath, new TextEncoder().encode(output));
            });
        };
    }

    private async walkFiles(root: vscode.Uri, processor: (filePath: vscode.Uri) => Promise<void>) {
        const type = await vscode.workspace.fs.stat(root);
        if (type.type === vscode.FileType.File) {
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

    private async registerContext(language: Language, source: string, filePath: vscode.Uri, mode?: Mode) {
        try {
            if (!Configuration.isExtendedSourceContextEnabled() || (mode && !this.isExtendedContextSupported(mode))) {
                return;
            }

            const sourceContexts = await this.resolveContext(filePath, language, source);

            const createContextResponse = await this.client.createContext(this.createCreateContextRequest());
            const contextId = createContextResponse.id;

            await this.client.registerContext(this.createRegisterContextRequest(contextId, sourceContexts));
            return contextId;
        } catch (error) {
            console.warn('Context discovery failed ', error);
            return;
        }
    }

    private async discoverContext(filePath: vscode.Uri, language: Language, source: string) {
        const baseDir = path.dirname(filePath.fsPath);

        const discoverContextResponse = await this.client.discoverContext(this.createDiscoverContextRequest(language, source, filePath.path));
        return discoverContextResponse.requiredContexts.map(context => path.resolve(baseDir, path.relative(path.basename(filePath.fsPath), context.path)))
            .filter(p => fs.existsSync(p))
            .map(p => vscode.Uri.file(p));
    }

    private async resolveContext(filePath: vscode.Uri, language: Language, source: string) {
        const paths: vscode.Uri[] = await this.discoverContext(filePath, language, source);

        const sourceContexts = [];
        for (let p of paths) {
            try {
                const content = await vscode.workspace.fs.readFile(p);
                const source = this.decoder.decode(content);
                sourceContexts.push({
                    language: language,
                    input: {
                        source
                    },
                    path: p.fsPath
                });
            } catch {
                console.warn("Failed to resolve file context.");
            }
        }
        return sourceContexts;
    }

    private async predictiveProcess(request: PredictRequest) {
        await this.client.prediction(request);
    }

    private async process(request: ProcessRequest) {
        const response = await this.client.process(request);
        return response.output.source;
    }

    private async completion(request: CompletionRequest) {
        const response = await this.client.completion(request);
        return response.output.source;
    }

    private async readFile(filePath: vscode.Uri) {
        // Save the underlying file if there are unpersisted changes
        const textDocument = await vscode.workspace.openTextDocument(filePath);
        if (textDocument.isDirty) {
            await textDocument.save();
        }

        const sourceEncoded = await vscode.workspace.fs.readFile(filePath);
        return this.decoder.decode(sourceEncoded);
    }

    private isExtendedContextSupported(mode: Mode) {
        return mode === Mode.code
            || mode === Mode.editCode
            || mode === Mode.inlineCode;
    }

    private createProcessRequest(mode: Mode, language: Language, source: string, modify: Modify, codePath?: string, prompt?: string, contextId?: string): ProcessRequest {
        return {
            mode,
            language,
            input: {
                source,
            },
            options: {
                modify,
                codePath,
                prompt,
                contextId,
            },
        };
    }

    private createCompletionProcessRequest(language: Language, source: string, codePath: string, allowMultiLineAutocomplete: boolean, codeSnippetContexts: CodeSnippetContext[], contextId?: string): CompletionRequest {
        return {
            language,
            input: {
                source,
            },
            options: {
                codePath,
                allowMultiLineAutocomplete,
                codeSnippetContexts,
                contextId
            }
        };
    }

    private createPredictRequest(language: Language, source: string, contextId?: string): PredictRequest {
        return {
            language,
            input: {
                source,
            },
            options: {
                contextId
            }
        };
    }

    private createDiscoverContextRequest(language: Language, source: string, path: string): DiscoverContextRequest {
        return {
            context: {
                language,
                input: {
                    source,
                },
                path
            }
        };
    }

    private createCreateContextRequest(): CreateContextRequest {
        return {};
    }

    private createRegisterContextRequest(id: string, contexts: SourceContext[]): RegisterContextRequest {
        return {
            id,
            contexts
        };
    }
}

export default CodemakerService;