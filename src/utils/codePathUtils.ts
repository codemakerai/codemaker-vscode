// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';

export async function findCodePath(uri: vscode.Uri, position: vscode.Position) {
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        uri
    );

    if (!symbols) {
        return;
    }

    for (let symbol of symbols) {
        if (symbol.range.contains(position)) {
            if (symbol.kind === vscode.SymbolKind.Function) {                
                const name = callableSignature(symbol.name);                
                return `${name}(*)`;
            } else if (symbol.kind === vscode.SymbolKind.Class) {
                if (!symbol.children) {
                    return;
                }
                for (let child of symbol.children) {
                    if (child.range.contains(position) && child.kind === vscode.SymbolKind.Method) {
                        const name = callableSignature(child.name);
                        return `${symbol.name}.${name}(*)`;
                    }
                }
            }
        }
    }
    return;
}

function callableSignature(name: string) {
    return name.replace(/\(.*\)/, '');
}