import * as vscode from 'vscode';
import CodemakerService from './service/codemakerservice';
import { 
    checkLineLength, 
    isEndOfLine, 
    isComment, 
    langFromFileExtension 
} from './Utils';
import { Language } from './sdk/model/Model';

export default class InlineCompletionItemProvider implements vscode.InlineCompletionItemProvider {

    private readonly completionDelay: number = 800;
    private readonly newLine: string = '\n';

    private completionOutput: string = ""
    private service: CodemakerService;

    constructor(service: CodemakerService) {
        this.service = service;
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken) {

        if (this.shouldSkip(document, position)) {
            console.log("Skipped completion")
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
        const startPosition = this.getStartPosition(currLineBeforeCursor)

        const needNewRequest = this.shouldInvokeCompletion(currLineBeforeCursor);
        if (needNewRequest) {
            var output = await this.service.complete(document.getText(), langFromFileExtension(document.fileName), offset - 1);
            output = this.sanitize(output)!;
            if (output === '') {
                return;
            }
            this.completionOutput = currLineBeforeCursor.trim() + output;
        }

        const result: vscode.InlineCompletionList = {
            items: [{
                insertText: this.completionOutput,
                range: new vscode.Range(position.line, startPosition, position.line, document.lineAt(position.line).text.length),
            }]
        };
        return result;
    }

    private shouldSkip(document: vscode.TextDocument, position: vscode.Position): boolean {
        if (!isComment(position) 
        || !checkLineLength(position) 
        || !isEndOfLine(document, position) 
        // TODO remove. Today only support java doc completion.
        || langFromFileExtension(document.fileName) !== Language.java) {
            return true;
        }
        return false;
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

    private sanitize(output: string): string {
        if (output === '' || output.startsWith('\n')) {
            return '';
        }
        return output.split(this.newLine).pop()!;
    }
}