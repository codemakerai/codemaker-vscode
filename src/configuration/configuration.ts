// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';

export class Configuration {

    static apiKey(): string {
        return this.get<string>('codemaker.apiKey').trim();
    }

    static model(): string | undefined {
        const model = this.get<string>('codemaker.model');
        if (model === "default") {
            return undefined;
        }
        return model;
    }

    static isAutocompleteEnabled(): boolean {
        return this.get('codemaker.enableAutocomplete');
    }

    static isAllowMultiLineAutocomplete(): boolean {
        return this.get('codemaker.allowMultiLineAutocomplete');
    }

    static isAllowLocalContext(): boolean {
        return this.get('codemaker.allowLocalContext');
    }

    static isCodeActionsEnabled(): boolean {
        return this.get('codemaker.enableCodeActions');
    }

    static isPredictiveGenerationEnabled(): boolean {
        return this.get('codemaker.enablePredictiveGeneration');
    }

    static isSyntaxAutocorrectionEnabled(): boolean {
        return this.get('codemaker.enableSyntaxAutocorrection');
    }

    static isExtendedSourceContextEnabled(): boolean {
        return this.get('codemaker.enableExtendedSourceContext');
    }

    static getExtendedSourceContextDepth(): number {
        return this.get('codemaker.extendedSourceContextDepth');
    }

    static isAssistantActionsEnabled(): boolean {
        return this.get('codemaker.enableAssistantActions');
    }

    private static get<T>(key: string): T {
        return vscode.workspace.getConfiguration().get(key) as T;
    }
}