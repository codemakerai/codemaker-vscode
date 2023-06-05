// Copyright 2023 CodeMaker AI Inc. All rights reserved.

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import CodemakerService from './service/codemakerservice';
import { AuthenticationError, UnsupportedLanguageError } from './sdk/Errors';
import InlineCompletionItemProvider from './InlineCompletionItemProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "CodeMaker" is now active!');

	const token = vscode.workspace.getConfiguration().get('codemaker.apiKey') as string;
	const codeMakerService = new CodemakerService(token);

	await init(context, codeMakerService);

	context.subscriptions.push(vscode.commands.registerCommand('extension.ai.codemaker.generate.doc', (uri) => {
		vscode.window.showInformationMessage(`Generating documentation for ${uri ? uri.path : 'null'}`);
		if (uri) {
			codeMakerService.generateDocumentation(vscode.Uri.parse(uri.path))
				.then(() => {
					vscode.window.showInformationMessage(`Documentation generated for ${uri ? uri.path : 'null'}`);
				})
				.catch(err => {
					if (err instanceof AuthenticationError) {
						vscode.window.showInformationMessage(`Invalid token`);
					} else if (err instanceof UnsupportedLanguageError) {
						vscode.window.showInformationMessage(err.message);
					} else {
						console.error(err);
						vscode.window.showInformationMessage(`Documentation generation failed`);
					}
				});
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.ai.codemaker.generate.code', (uri) => {
		vscode.window.showInformationMessage(`Generating code for ${uri ? uri.path : 'null'}`);
		if (uri) {
			codeMakerService.generateCode(vscode.Uri.parse(uri.path))
				.then(() => {
					vscode.window.showInformationMessage(`Code generated for ${uri ? uri.path : 'null'}`);
				})
				.catch(err => {
					if (err instanceof AuthenticationError) {
						vscode.window.showInformationMessage(`Invalid token`);
					} else if (err instanceof UnsupportedLanguageError) {
						vscode.window.showInformationMessage(err.message);
					} else {
						console.error(err);
						vscode.window.showInformationMessage(`Code generation failed`);
					}
				});
		}
	}));
	
	
}

// This method is called when your extension is deactivated
export function deactivate() {}

async function init(context: vscode.ExtensionContext, service: CodemakerService) {

	const provider: vscode.InlineCompletionItemProvider = new InlineCompletionItemProvider(service);
	context.subscriptions.push(
		vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, 
		new InlineCompletionItemProvider(service)), 
	);
}