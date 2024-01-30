import * as vscode from 'vscode';
import CodemakerService from '../service/codemakerService';
import { langFromFileExtension } from '../utils/languageUtils';

enum CommandType {
    alert = 'alert',
    copyToClipboard = 'copyToClipboard',
    assistantRequest = 'assistantRequest',
    assistantRespondAdded = 'assistantRespondAdded',
    assistantRespondError = 'assistantRespondError',
}

interface ICommand {
    execute(message: any, webviewView: vscode.WebviewView): Promise<void>;
}

class AlertCommand implements ICommand {
    async execute(message: any, webviewView: vscode.WebviewView) {
        vscode.window.showErrorMessage(message.text);
    }
}

class CopyToClipboardCommand implements ICommand {
    async execute(message: any, webviewView: vscode.WebviewView) {
        vscode.env.clipboard.writeText(message.text);
    }
}

class AssistantRequestCommand implements ICommand {

    constructor(private readonly _codemakerService: CodemakerService) {}

    async execute(message: any, webviewView: vscode.WebviewView) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            console.warn('No active editor');
            webviewView.webview.postMessage({
                command: CommandType.assistantRespondError,
                error: 'No active editor selected',
            });
            return;
        }
        const doc = editor.document;
        const source = doc.getText();
        const language = langFromFileExtension(doc.fileName);
        
        const result = await this._codemakerService.assistantCodeCompletion(message.text, language, source);
        
        if (result.output.source !== null && result.output.source.length > 0) {
            editor.edit(builder => {
                const range = new vscode.Range(doc.lineAt(0).range.start, doc.lineAt(doc.lineCount - 1).range.end);
                builder.replace(range, result.output.source);
            });
        }

        webviewView.webview.postMessage({
            command: CommandType.assistantRespondAdded,
            result: result,
        });
    }
}

export { CommandType, ICommand, AlertCommand, CopyToClipboardCommand, AssistantRequestCommand };

