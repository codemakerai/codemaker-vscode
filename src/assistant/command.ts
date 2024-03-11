import * as vscode from 'vscode';
import CodemakerService from '../service/codemakerService';
import { langFromFileExtension, isFileSupported } from '../utils/languageUtils';
import { Configuration } from '../configuration/configuration';

enum CommandType {
    alert = 'alert',
    copyToClipboard = 'copyToClipboard',
    assistantRequest = 'assistantRequest',
    assistantRespondAdded = 'assistantRespondAdded',
    assistantError = 'assistantError',
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
        if (!Configuration.apiKey()) {
            webviewView.webview.postMessage({
                command: CommandType.assistantRespondAdded,
                result: {
                    message: "To use Assistant features, please first set the API Key in the Extension Settings." +
                        "\nYou can create free account [here](https://portal.codemaker.ai/#/register)."
                },
            });
            return;
        }

        try {
            const isAssistantActionsEnabled = Configuration.isAssistantActionsEnabled();

            const editor = vscode.window.activeTextEditor;

            if (!isAssistantActionsEnabled || !editor || !isFileSupported(editor.document.fileName)) {
                const result = await this._codemakerService.assistantCompletion(message.text);

                webviewView.webview.postMessage({
                    command: CommandType.assistantRespondAdded,
                    result: result,
                });
            } else {
                const path = editor.document.uri;
                
                const output = await this._codemakerService.assistantCodeCompletion(message.text, path);
        
                webviewView.webview.postMessage({
                    command: CommandType.assistantRespondAdded,
                    result: output,
                });
            }
        } catch (error) {
            webviewView.webview.postMessage({
                command: CommandType.assistantError,
                error: 'Assistant could not complete this request. Please try again.',
            });
        }
    }
}

export { CommandType, ICommand, AlertCommand, CopyToClipboardCommand, AssistantRequestCommand };

