import * as vscode from 'vscode';
import CodemakerService from '../service/codemakerService';
import { langFromFileExtension, isFileSupported } from '../utils/languageUtils';
import { Configuration } from '../configuration/configuration';

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
        const isAssistantActionsEnabled = Configuration.isAssistantActionsEnabled();

        const editor = vscode.window.activeTextEditor;

        if (!isAssistantActionsEnabled || !editor || !isFileSupported(editor.document.fileName)) {
            const result = await this._codemakerService.assistantCompletion(message.text);

            webviewView.webview.postMessage({
                command: CommandType.assistantRespondAdded,
                result: result,
            });
        } else {
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
}

export { CommandType, ICommand, AlertCommand, CopyToClipboardCommand, AssistantRequestCommand };

