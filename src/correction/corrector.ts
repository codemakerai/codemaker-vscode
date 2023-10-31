import * as vscode from 'vscode';
import { Configuration } from '..//configuration/configuration';
import { isFileSupported } from '../utils/languageUtils';
import CodeMakerService from '../service/codemakerService';

export class Corrector {

    private readonly codeMakerService: CodeMakerService;

    private readonly correctedFiles: Set<string>;

    constructor(codeMakerService: CodeMakerService) {
        this.codeMakerService = codeMakerService;
        this.correctedFiles = new Set<string>();
    }

    async correct(document: vscode.TextDocument) {
        if (!Configuration.isSyntaxAutocorrectionEnabled()) {
            return;
        }

        if (!isFileSupported(document.fileName)) {
            return;
        }

        const uri = document.uri;
        if (!this.canCorrect(uri)) {
            return;
        }

        try {            
            this.correctedFiles.add(uri.toString());
            await this.codeMakerService.fixSyntax(document.uri);
        } finally {
            this.correctedFiles.delete(uri.toString());
        }
    }

    async delete(document: vscode.TextDocument) {
        this.correctedFiles.delete(document.uri.toString());
    }

    subscribeToDucumentChanges(context: vscode.ExtensionContext) {
        if (vscode.window.activeTextEditor) {
            this.correct(vscode.window.activeTextEditor.document);
        }
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) {
                    this.correct(editor.document);
                }
            })
        );

        context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument(event => this.correct(event))
        );

        context.subscriptions.push(
            vscode.workspace.onDidCloseTextDocument(document => this.delete(document))
        );
    }

    private canCorrect(uri: vscode.Uri) {
        return !this.correctedFiles.has(uri.toString());
    }
}