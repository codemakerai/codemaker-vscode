// Copyright 2023 CodeMaker AI Inc. All rights reserved.

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import CodemakerService from './service/codemakerService';
import { AuthenticationError, UnsupportedLanguageError } from './sdk/errors';
import CompletionProvider from './completion/completionProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "CodeMaker" is now active!');

	const token = vscode.workspace.getConfiguration().get('codemaker.apiKey') as string;
	const codemakerService = new CodemakerService(token);
	
	registerActions(context, codemakerService);
	registerCompletionProvider(context, codemakerService);
}

// This method is called when your extension is deactivated
export function deactivate() { }

function errorHandler(action: string, err: any) {
	if (err instanceof AuthenticationError) {
		vscode.window.showInformationMessage(`Invalid token`);
	} else if (err instanceof UnsupportedLanguageError) {
		vscode.window.showInformationMessage(err.message);
	} else {
		console.error(err);
		vscode.window.showInformationMessage(`${action} failed`);
	}
}

function registerActions(context: vscode.ExtensionContext, codemakerService: CodemakerService) {
	context.subscriptions.push(vscode.commands.registerCommand('extension.ai.codemaker.generate.doc', (uri) => {
		vscode.window.showInformationMessage(`Generating documentation for ${uri ? uri.path : 'null'}`);
		if (uri) {
			codemakerService.generateDocumentation(vscode.Uri.parse(uri.path))
				.then(() => {
					vscode.window.showInformationMessage(`Documentation generated for ${uri ? uri.path : 'null'}`);
				})
				.catch(err => errorHandler("Documentation generation", err));
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.ai.codemaker.generate.code', (uri) => {
		vscode.window.showInformationMessage(`Generating code for ${uri ? uri.path : 'null'}`);
		if (uri) {
			codemakerService.generateCode(vscode.Uri.parse(uri.path))
				.then(() => {
					vscode.window.showInformationMessage(`Code generated for ${uri ? uri.path : 'null'}`);
				})
				.catch(err => errorHandler("Code generation", err));
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.ai.codemaker.replace.doc', (uri) => {
		vscode.window.showInformationMessage(`Replacing documentation for ${uri ? uri.path : 'null'}`);
		if (uri) {
			codemakerService.replaceDocumentation(vscode.Uri.parse(uri.path))
				.then(() => {
					vscode.window.showInformationMessage(`Documentation replaced for ${uri ? uri.path : 'null'}`);
				})
				.catch(err => errorHandler("Documentation replacement", err));
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.ai.codemaker.replace.code', (uri) => {
		vscode.window.showInformationMessage(`Replacing code for ${uri ? uri.path : 'null'}`);
		if (uri) {
			codemakerService.replaceCode(vscode.Uri.parse(uri.path))
				.then(() => {
					vscode.window.showInformationMessage(`Code replaced for ${uri ? uri.path : 'null'}`);
				})
				.catch(err => errorHandler("Code replacement", err));
		}
	}));
}

function registerCompletionProvider(context: vscode.ExtensionContext, service: CodemakerService) {
	const provider = new CompletionProvider(service);
	context.subscriptions.push(
		vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, provider)
	);
}