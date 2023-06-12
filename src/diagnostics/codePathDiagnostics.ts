import * as vscode from 'vscode';
import { Configuration } from '..//configuration/configuration';
import { isFileSupported } from '../utils/languageUtils';

export const CODE_PATH = 'code_path';

export async function refreshDiagnostics(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection) {
    if (!Configuration.isCodeActionsEnabled()) {
        return;
    }

    if (!isFileSupported(document.fileName)) {
        return;
    }

    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        document.uri
    );

    if (!symbols) {
        return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    for (let symbol of symbols) {
        if (symbol.kind == vscode.SymbolKind.Function) {
            diagnostics.push(createDiagnostic(symbol.range, 'Function'));
        } else if (symbol.kind == vscode.SymbolKind.Class) {
            if (!symbol.children) {
                return;
            }
            for (let child of symbol.children) {
                if (child.kind == vscode.SymbolKind.Method) {                    
                    diagnostics.push(createDiagnostic(child.range, 'Method'));
                }
            }
        }
    }
    diagnosticCollection.set(document.uri, diagnostics);
}

export function subscribeToDocumentChanges(context: vscode.ExtensionContext, diagnosticsCollection: vscode.DiagnosticCollection): void {
    if (vscode.window.activeTextEditor) {
        refreshDiagnostics(vscode.window.activeTextEditor.document, diagnosticsCollection);
    }
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                refreshDiagnostics(editor.document, diagnosticsCollection);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, diagnosticsCollection))
    );

    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(doc => diagnosticsCollection.delete(doc.uri))
    );

}

function createDiagnostic(range: vscode.Range, title: string) {
    const diagnostic = new vscode.Diagnostic(range, title, vscode.DiagnosticSeverity.Hint);
    diagnostic.code = CODE_PATH;
    return diagnostic;
}