import * as vscode from 'vscode';
import CodemakerService from '../service/codemakerService';
import CommandHandler from './commandHandler';

export default class AssistantChatViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _commandHandler: CommandHandler

    constructor(private readonly _extensionUri: vscode.Uri, codemakerService: CodemakerService) {
        this._commandHandler = new CommandHandler(codemakerService);
    }

    public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
				this._extensionUri
			],
        };

        webviewView.webview.onDidReceiveMessage(
            async message => {
                await this._commandHandler.handleCommand(message.command, message, webviewView);
            }
        );
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        
        // Local path to main script run in the webview
        const mainScriptUrl = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const mainCssUrl = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));
        const markedScriptUrl = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'marked.min.js'));
        const highlightScriptUrl = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'highlight.min.js'));
        const atomCssUrl = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'atom-one-dark.min.css'));

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CODEMAKER AI</title>
            <link href="${mainCssUrl}" rel="stylesheet">
            <link href="${atomCssUrl}" rel="stylesheet">

            <script src="${highlightScriptUrl}"></script>
            <script src="${markedScriptUrl}"></script>
            <script src="${mainScriptUrl}"></script>
        </head>
        <body>
            <div id="chatbox"></div>
            <form id="inputForm">
                <input type="text" id="inputField" autocomplete="off"/>
                <button id="submitButton" type="submit">Send</button>
            </form>
        </body>
        </html>`;
    }
}
