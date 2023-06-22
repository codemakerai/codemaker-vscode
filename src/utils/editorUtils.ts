// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';

const minimumLineLength: number = 4;
const END_OF_LINE_REGEX = new RegExp("^\\s*[)}\\]\"'`]*\\s*[:{;,]?\\s*$");

export function isComment(position: vscode.Position) {
    const document = vscode.window.activeTextEditor?.document;
    if (!document) {
        return;
    }
    let line = document.lineAt(position.line).text.trim();
    // TODO make comment format for generic for all languages.
    if (!line.startsWith('*/') &&
        (line.startsWith('//') || line.startsWith('/**') || line.startsWith('*'))) {
        return true;
    }
    return false;
}

export function checkLineLength(position: vscode.Position) {
    const document = vscode.window.activeTextEditor?.document;
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

export function getIndentationAtPosition(position: vscode.Position) {
    const document = vscode.window.activeTextEditor?.document;
    if (!document) {
        return;
    }
    return document.lineAt(position.line).text.match(/^\s*/)?.[0] || '';
}
