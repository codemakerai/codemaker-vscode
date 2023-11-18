// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';

export function codePathFromOffset(editor: vscode.TextEditor) {
    const offset = editor.document.offsetAt(editor.selection.active);
    return `@${offset}`;
}