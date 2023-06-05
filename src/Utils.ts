import * as vscode from 'vscode';
import { Language } from './sdk/model/Model';
import { UnsupportedLanguageError } from './sdk/Errors';

const minimumLineLength: number = 10;

export function langFromFileExtension(fileName: string): Language {
    const ext = fileName.split('.').pop();
    switch (ext) {
        case 'java':
            return Language.java;
        case 'js':
            return Language.javascript;
        case 'kt':
            return Language.kotlin;
        default:
            console.info("unsupported language: " + ext);
            throw new UnsupportedLanguageError(ext);
    }
}

export function isComment(position: vscode.Position) {
    
    let document = vscode.window.activeTextEditor?.document;
    if (!document) {
        return;
    }
    let line = document.lineAt(position.line).text.trim();
    if (!line.startsWith('*/') && 
        (line.startsWith('//') || line.startsWith('/**') || line.startsWith('*'))) {
        return true;
    }
    return false;
}

export function checkLineLength(position: vscode.Position) {
    
    let document = vscode.window.activeTextEditor?.document;
    if (!document) {
        return;
    }
    let line = document.lineAt(position.line).text.trim();
    return line.length >= minimumLineLength;
}

export function hasNonWhiteSpaceCharactersAfterCursor(document: vscode.TextDocument, position: vscode.Position) {
        const lineSuffix = document.getText(
            new vscode.Range(position, document.lineAt(position.line).range.end)
        );
        return lineSuffix.trim() === '';
}