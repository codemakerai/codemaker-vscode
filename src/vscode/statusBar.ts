// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';

enum StatusBarStatus {
    none = "",
    processing = `$(loading~spin)`
}

class CodemakerStatusbar {

    // TODO add codemaker image as text icon
    private readonly baseTitle: string = "CodeMaker";
    private readonly statusBar: vscode.StatusBarItem;

    constructor(context: vscode.ExtensionContext) {
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 200);
        this.statusBar.text = this.baseTitle;
        this.statusBar.show();
        context.subscriptions.push(this.statusBar);
    }

    public updateStatusBar(status: StatusBarStatus) {
        this.statusBar.text = `${status} ${this.baseTitle}`;
        console.log("--------------------------------" + this.statusBar.text)
    }

    public reset() {
        this.statusBar.text = this.baseTitle
    }

    // TODO add disable/enable config shortcut
}

export { StatusBarStatus, CodemakerStatusbar }