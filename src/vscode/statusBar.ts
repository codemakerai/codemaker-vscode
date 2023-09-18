// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';

enum StatusBarStatus {
    default = `$(codemaker-icon)`,
    processing = `$(loading~spin)`
}

class CodemakerStatusbar {

    private readonly statusBar: vscode.StatusBarItem;

    constructor(context: vscode.ExtensionContext) {
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 200);
        this.statusBar.text = StatusBarStatus.default;
        this.statusBar.show();
        context.subscriptions.push(this.statusBar);
    }

    public updateStatusBar(status: StatusBarStatus) {
        this.statusBar.text = `${status}`;
    }

    public reset() {
        this.statusBar.text = StatusBarStatus.default;
    }

    // TODO make icon clickable, such as disable/enable config shortcut
}

export { StatusBarStatus, CodemakerStatusbar };