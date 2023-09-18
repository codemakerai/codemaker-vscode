// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';

// TODO add more import statements for different languages
const importStatements = [
    /Add import.*/,
    /Update import from .*/,
    /Import .*/,
];

export default async function completionImports(completion: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const lines = completion.split('\n');
    const selection = editor.selection;
    const completionSelection = new vscode.Selection(
        selection.active.translate(
            -(lines.length - 1),
            lines.length > 1 ? -selection.active.character : -completion.length
        ),
        selection.active
    );

    const quickFixSuggestions = await vscode.commands.executeCommand(
        'vscode.executeCodeActionProvider', 
        editor.document.uri, 
        completionSelection, 
        vscode.CodeActionKind.QuickFix.value
    ) as vscode.CodeAction[];

    if (quickFixSuggestions && quickFixSuggestions.length > 0) {
        const importCommands = quickFixSuggestions.filter(suggestion => importStatements.some(stmt => stmt.test(suggestion.title)));
        // if there are multiple import options, skip auto import.
        if (importCommands.length === 1 && importCommands[0].edit) {
            await vscode.workspace.applyEdit(importCommands[0].edit);
        }
    }
}