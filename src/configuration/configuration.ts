// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';

export class Configuration {

    static apiKey(): string {
        return this.get('codemaker.apiKey');
    }

    static isAutoCompleteEnabled(): boolean {
        return this.get('codemaker.enableAutocomplete');
    }

    static isCodeActionsEnabled(): boolean {
        return this.get('codemaker.enableCodeActions');
    }

    private static get<T>(key: string): T {
        return vscode.workspace.getConfiguration().get(key) as T;
    }
}