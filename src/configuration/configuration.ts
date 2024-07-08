// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import { LanguageCode } from 'codemaker-sdk';
import * as vscode from 'vscode';

export class Configuration {

    static apiKey(): string {
        return this.get<string>('codemaker.apiKey').trim();
    }

    static language(): LanguageCode | undefined {
        let language = this.get<string>('codemaker.language');
        if (!language || language === "DEFAULT") {
            return undefined;
        } else if (language === "SYSTEM") {
            language = vscode.env.language.substring(0, 2).toUpperCase();            
        }
        return language as LanguageCode;
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

    static isAssistantMuted(): boolean {
        return this.get('codemaker.muteAssistant');
    }

    static isAssistantActionsEnabled(): boolean {
        return this.get('codemaker.enableAssistantActions');
    }

    static isAssistantCodeLensEnabled(): boolean {
        return this.get('codemaker.enableAssistantCodeLens');
    }

    static getEndpoint(): string {
        return this.get('codemaker.endpoint');
    }

    private static get<T>(key: string): T {
        return vscode.workspace.getConfiguration().get(key) as T;
    }
}