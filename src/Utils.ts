import * as vscode from 'vscode';
import { Language } from './sdk/model/Model';
import { UnsupportedLanguageError } from './sdk/Errors';

const minimumLineLength: number = 10;
const END_OF_LINE_REGEX = new RegExp("^\\s*[)}\\]\"'`]*\\s*[:{;,]?\\s*$");

export function langFromFileExtension(fileName: string): Language {
    const ext = fileName.split('.').pop();
    switch (ext) {
        case 'java':
            return Language.java;
        case 'js':
        case 'jsx':
            return Language.javascript;
        case 'kt':
            return Language.kotlin;
        case 'go':
            return Language.go;    
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

export function isEndOfLine(document: vscode.TextDocument, position: vscode.Position) {
        const suffix = document.getText(
            new vscode.Range(position, document.lineAt(position.line).range.end)
        );
        return END_OF_LINE_REGEX.test(suffix);
}