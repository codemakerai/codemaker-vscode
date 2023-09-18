// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';
import { Configuration } from '..//configuration/configuration';
import { isFileSupported } from '../utils/languageUtils';
import CodeMakerService from '../service/codemakerService';

const predictiveGenerationCoolDown = 1000 * 30;

export class Predictor {

    private readonly codeMakerService: CodeMakerService;

    private readonly lastPredictiveGeneration: Map<string, Date>;

    constructor(codeMakerService: CodeMakerService) {
        this.codeMakerService = codeMakerService;
        this.lastPredictiveGeneration = new Map<string, Date>();
    }

    async refresh(document: vscode.TextDocument) {
        if (!Configuration.isPredictiveGenerationEnabled()) {
            return;
        }
    
        if (!isFileSupported(document.fileName)) {
            return;
        }

        if (!this.canRefresh(document)) {
            return;
        }

        const uri = document.uri;        
        this.codeMakerService.predictiveGeneration(document.uri);
        this.lastPredictiveGeneration.set(uri.toString(), new Date());
    }

    async delete(document: vscode.TextDocument) {
        this.lastPredictiveGeneration.delete(document.uri.toString());
    }

    subscribeToDucumentChanges(context: vscode.ExtensionContext) {
        if (vscode.window.activeTextEditor) {
            this.refresh(vscode.window.activeTextEditor.document);
        }
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) {
                    this.refresh(editor.document);
                }
            })
        );
    
        context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(event => this.refresh(event.document))
        );

        context.subscriptions.push(
            vscode.workspace.onDidCloseTextDocument(document => this.delete(document))
        );
    }

    private canRefresh(document: vscode.TextDocument) {
        const lastGenerationTime = this.lastPredictiveGeneration.get(document.uri.toString());
        return !lastGenerationTime 
            || (new Date().getTime() - lastGenerationTime.getTime()) >= predictiveGenerationCoolDown;
    }
}