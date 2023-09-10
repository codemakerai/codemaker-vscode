// Copyright 2023 CodeMaker AI Inc. All rights reserved.

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import CodemakerService from './service/codemakerService';
import { AuthenticationError, UnsupportedLanguageError } from 'codemaker-sdk';
import CompletionProvider from './completion/completionProvider';
import { findCodePath } from './utils/codePathUtils';
import { CODE_PATH, subscribeToDocumentChanges } from './diagnostics/codePathDiagnostics';
import { Predictor } from './predictor/predictor';
import completionImports from './completion/completionImports';
import { CodemakerStatusbar, StatusBarStatus } from './vscode/statusBar'
import {
    isComment
} from './utils/editorUtils';

let statusBar: CodemakerStatusbar;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "CodeMaker" is now active!');

	const codemakerService = new CodemakerService();
	statusBar = new CodemakerStatusbar(context);

	registerDiagnostics(context);
	registerActions(context, codemakerService);
	registerCompletionProvider(context, codemakerService);
	registerCodeAction(context, codemakerService);
	registerPredictiveGeneration(context, codemakerService);
}

// This method is called when your extension is deactivated
export function deactivate() { }

function errorHandler(action: string, err: any) {
	if (err instanceof AuthenticationError) {
		vscode.window.showInformationMessage(`Invalid API Key. Configure the the API Key in the Settings > Extensions > CodeMaker AI.`);
	} else if (err instanceof UnsupportedLanguageError) {
		vscode.window.showInformationMessage(err.message);
	} else {
		console.error(err);
		vscode.window.showInformationMessage(`${action} failed`);
	}
}

function registerDiagnostics(context: vscode.ExtensionContext) {
	const diagnosticColection = vscode.languages.createDiagnosticCollection("ai.codemaker.codepath");
	context.subscriptions.push(diagnosticColection);
	subscribeToDocumentChanges(context, diagnosticColection);
}

function registerActions(context: vscode.ExtensionContext, codemakerService: CodemakerService) {
	context.subscriptions.push(vscode.commands.registerCommand('extension.ai.codemaker.generate.doc', (uri) => {
		if (uri) {
			statusBar.updateStatusBar(StatusBarStatus.processing);
			codemakerService.generateDocumentation(vscode.Uri.parse(uri.path))
				.catch(err => errorHandler("Documentation generation", err))
				.finally(() => statusBar.reset());
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.ai.codemaker.generate.code', (uri) => {
		if (uri) {
			statusBar.updateStatusBar(StatusBarStatus.processing);
			codemakerService.generateCode(vscode.Uri.parse(uri.path))
				.catch(err => errorHandler("Code generation", err))
				.finally(() => statusBar.reset());
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.ai.codemaker.replace.doc', (uri) => {
		if (uri) {
			statusBar.updateStatusBar(StatusBarStatus.processing);
			codemakerService.replaceDocumentation(vscode.Uri.parse(uri.path))
				.catch(err => errorHandler("Documentation replacement", err))
				.finally(() => statusBar.reset());
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.ai.codemaker.replace.code', (uri) => {
		if (uri) {
			statusBar.updateStatusBar(StatusBarStatus.processing);
			codemakerService.replaceCode(vscode.Uri.parse(uri.path))
				.catch(err => errorHandler("Code replacement", err))
				.finally(() => statusBar.reset());
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.ai.codemaker.replace.method.doc', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const uri = editor.document.uri;
		const codePath = await findCodePath(uri, editor.selection.active)
		if (!codePath) {
			return null;
		}

		statusBar.updateStatusBar(StatusBarStatus.processing);
		codemakerService.replaceDocumentation(vscode.Uri.parse(uri.path), codePath)
			.catch(err => errorHandler("Documentation replacement", err))
			.finally(() => statusBar.reset());
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.ai.codemaker.replace.method.code', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const uri = editor.document.uri;
		const codePath = await findCodePath(uri, editor.selection.active)
		if (!codePath) {
			return null;
		}

		statusBar.updateStatusBar(StatusBarStatus.processing);
		codemakerService.replaceCode(vscode.Uri.parse(uri.path), codePath)
			.catch(err => errorHandler("Code replacement", err))
			.finally(() => statusBar.reset());
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.ai.codemaker.generate.inline.code', (uri) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || !editor.document) {
			return;
		}

		if (!isComment(editor.selection.active)) {
			return;
		}
		
		const offset = editor.document.offsetAt(editor.selection.active);
		statusBar.updateStatusBar(StatusBarStatus.processing);
		codemakerService.generateInlineCode(editor.document.uri, `@${offset}`)
			.catch(err => errorHandler("Inline code generation", err))
			.finally(() => statusBar.reset());
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.ai.codemaker.completion.import', completionImports));
}

function registerCompletionProvider(context: vscode.ExtensionContext, service: CodemakerService) {
	const provider = new CompletionProvider(service, statusBar);
	context.subscriptions.push(
		vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, provider)
	);
}

function registerCodeAction(context: vscode.ExtensionContext, service: CodemakerService) {
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('*', new ReplaceMethodCodeAction(), {
			providedCodeActionKinds: ReplaceMethodCodeAction.providedCodeActionKinds
		})
	);
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('*', new ReplaceMethodDocumentationAction(), {
			providedCodeActionKinds: ReplaceMethodDocumentationAction.providedCodeActionKinds
		})
	);
}

function registerPredictiveGeneration(context: vscode.ExtensionContext, codemakerService: CodemakerService) {
	const predictor = new Predictor(codemakerService);
	predictor.subscribeToDucumentChanges(context);
}

export class ReplaceMethodCodeAction implements vscode.CodeActionProvider {

	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	provideCodeActions(document: vscode.TextDocument, selection: vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken) {
		return context.diagnostics
			.filter(diagnostic => diagnostic.code === CODE_PATH).map(diagnostic => this.createCommand(diagnostic));
	}

	createCommand(diagnostic: vscode.Diagnostic) {
		const action = new vscode.CodeAction('Replace code', vscode.CodeActionKind.QuickFix);
		action.command = { command: 'extension.ai.codemaker.replace.method.code', title: 'Replaces code', tooltip: 'This will replace code.' };
		action.isPreferred = true;
		return action;
	}
}

export class ReplaceMethodDocumentationAction implements vscode.CodeActionProvider {

	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	async provideCodeActions(document: vscode.TextDocument, selection: vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken) {
		return context.diagnostics
			.filter(diagnostic => diagnostic.code === CODE_PATH).map(diagnostic => this.createCommand(diagnostic));
	}

	createCommand(diagnostic: vscode.Diagnostic) {
		const action = new vscode.CodeAction('Replace documentation', vscode.CodeActionKind.QuickFix);
		action.command = { command: 'extension.ai.codemaker.replace.method.doc', title: 'Replaces documentation', tooltip: 'This will replace documentation.' };
		return action;
	}
}

