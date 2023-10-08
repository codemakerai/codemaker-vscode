// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';

export class Configuration {

    static apiKey(): string {
        return this.get('codemaker.apiKey');
    }

    static isAutocompleteEnabled(): boolean {
        return this.get('codemaker.enableAutocomplete');
    }

    static isAllowMultiLineAutocomplete(): boolean {
        return this.get('codemaker.allowMultiLineAutocomplete');
    }

    static isCodeActionsEnabled(): boolean {
        return this.get('codemaker.enableCodeActions');
    }

    static isPredictiveGenerationEnabled(): boolean {
        return this.get('codemaker.enablePredictiveGeneration');
    }

    private static get<T>(key: string): T {
        return vscode.workspace.getConfiguration().get(key) as T;
    }
}