// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';
import CodemakerService from '../service/codemakerService';
import {    
    langFromFileExtension
} from '../utils/languageUtils';
import {
    checkLineLength,
    isEndOfLine
} from '../utils/editorUtils';
import { Configuration } from '../configuration/configuration';
import { Indenter } from '../indentation/indenter';
import { CodemakerStatusbar, StatusBarStatus } from '../vscode/statusBar';

export default class CompletionProvider implements vscode.InlineCompletionItemProvider {

    private readonly completionDelay: number = 300;
    private readonly newLine: string = '\n';

    private readonly service: CodemakerService;
    private readonly statusBar: CodemakerStatusbar;

    private completionOutput: string = "";

    constructor(service: CodemakerService, statusBar: CodemakerStatusbar) {
        this.service = service;
        this.statusBar = statusBar;
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken) {

        if (this.shouldSkip(document, position)) {
            console.log("Skipped completion");
            return;
        }

        await this.delayOnRequest(token, this.completionDelay);
        if (token.isCancellationRequested) {
            console.log("Cancelled completion");
            return;
        }

        const currLineBeforeCursor = document.getText(
            new vscode.Range(position.with(undefined, 0), position)
        );
        const offset = document.offsetAt(position);
        const startPosition = this.getStartPosition(currLineBeforeCursor);

        const needNewRequest = this.shouldInvokeCompletion(currLineBeforeCursor);
        if (needNewRequest) {
            this.statusBar.updateStatusBar(StatusBarStatus.processing);
            var output = await this.service.complete(document.getText(), langFromFileExtension(document.fileName), offset - 1);

            console.log(`Completion output: ${output}`);

            output =  this.formatCode(output, currLineBeforeCursor)!;
            if (output === '') {
                return;
            }
            this.completionOutput = currLineBeforeCursor.trim() + output;
        }

        const result: vscode.InlineCompletionList = {
            items: [{
                insertText: this.completionOutput,
                range: new vscode.Range(position.line, startPosition, position.line, document.lineAt(position.line).text.length),
                command: this.getAutoImportCommand(this.completionOutput),
            }]
        };
        this.statusBar.reset();
        return result;
    }

    private shouldSkip(document: vscode.TextDocument, position: vscode.Position): boolean {
        return !Configuration.isAutoCompleteEnabled()
            || !checkLineLength(position)
            || !isEndOfLine(document, position);
    }

    private shouldInvokeCompletion(currLineBeforeCursor: string) {
        if (this.completionOutput.startsWith(currLineBeforeCursor.trim())) {
            console.log("Do not need new completion");
            return false;
        }
        return true;
    }

    private async delayOnRequest(token: vscode.CancellationToken, delay: number) {
        const canceledPromise = new Promise<void>((resolve) =>
            token.onCancellationRequested(resolve)
        );
        await Promise.race([
            canceledPromise,
            new Promise(resolve => setTimeout(resolve, delay))]);
    }

    private getStartPosition(currLineBeforeCursor: string) {
        return currLineBeforeCursor.length - currLineBeforeCursor.trimStart().length;
    }

    private formatCode(output: string, line: string): string {
        if (output === '') {
            return '';
        }
        const indenter = Indenter.fromInput(' ', 4, line);
        return indenter.alignIndentation(output);
    }

    private getAutoImportCommand(completion: string): vscode.Command {
        return {
            title: "complete import",
            command: "extension.ai.codemaker.completion.import",
            arguments: [
                completion,
            ],
        };
      }
}