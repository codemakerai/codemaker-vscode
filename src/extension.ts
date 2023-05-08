// Copyright 2023 CodeMaker AI Inc. All rights reserved.

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import CodemakerService from './service/codemakerservice';
import AuthenticationError from './sdk/AuthenticationError';
import WebSocket = require('ws');
import fs = require('fs');
import path = require('path');
import stream = require('stream');
import { off } from 'process';
import { buffer } from 'stream/consumers';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed


var results: string[] = []
const ws = new WebSocket('ws://localhost:8080');

ws.on('message', function message(data) {
	console.log('received: %s', data);
	results.push(data.toString());
});

const duplex = WebSocket.createWebSocketStream(ws, { encoding: 'utf8' });
duplex.on('error', console.error);

const readableStream = new stream.Readable({
    read(size: any) {}
});
const writeableStream = new stream.Writable({
	write(chunk, encoding, done) {
		console.log(chunk.toString());
		done();
	}
});
readableStream.pipe(duplex);
duplex.pipe(writeableStream);

let shouldComplete = false;
let change = false;

const AUTO_CLOSED_BRACKETS_CHANGE = ["()", "{}", "[]", '""', "''", "``"];

let lastShownSuggestion: vscode.InlineCompletionItem | undefined | null;

function onTextSelectionChange(): void {

	console.log("selection changed ");
	if (change) {
	  shouldComplete = true;
	  change = false;
	} else {
	  shouldComplete = false;
	}
}

function onChange(): void {
	change = true;
}

const tracker = [
	vscode.workspace.onDidChangeTextDocument(
		({ contentChanges, document }: vscode.TextDocumentChangeEvent) => {

			const currentPosition = vscode.window.activeTextEditor?.selection.active;
		  	const relevantChange = contentChanges.find(
				({ range }) => currentPosition && range.contains(currentPosition)
		  	);
		  	console.log("relevantChange " + relevantChange?.text);
			

			const changeLen = relevantChange?.text.trim().length;

			const isValidNonEmptyChange = !!relevantChange &&
				relevantChange.rangeLength >= 0 &&
				relevantChange.text != null;

			const isEndsWithWhitespace = relevantChange?.text.endsWith(
				" ".repeat(4)
			);
			const isEndsWithTab = relevantChange?.text.endsWith("\t");
			const isNewLine = relevantChange?.text.includes("\n");

			const isNotIndentationChange = !!relevantChange && 
				(isNewLine || (!isEndsWithWhitespace && !isEndsWithTab));

			const isSingleCharNonWhitespaceChange = !!relevantChange &&
				(relevantChange?.text.trim().length <= 1 ||
					AUTO_CLOSED_BRACKETS_CHANGE.includes(relevantChange.text));

			const changed = isValidNonEmptyChange && isNotIndentationChange && isSingleCharNonWhitespaceChange;
			if (changed) {
				onChange();
			}
			console.log("changeLen: " + changeLen);
			console.log("isValideNonEmptyChange: " + isValidNonEmptyChange);
			console.log("isNotIndentationChange: " + isNotIndentationChange);
			console.log("isSingleCharNonWhitespaceChange: " + isSingleCharNonWhitespaceChange);
			if (!!relevantChange)
				console.log("contains: " + AUTO_CLOSED_BRACKETS_CHANGE.includes(relevantChange.text))
		}
	  ),
	  vscode.window.onDidChangeTextEditorSelection(onTextSelectionChange),
];

const END_OF_LINE_VALID_REGEX = new RegExp("^\\s*[)}\\]\"'`]*\\s*[:{;,]?\\s*$");

function isValidMidlinePosition(
	document: vscode.TextDocument,
	position: vscode.Position
  ): boolean {
	const lineSuffix = document.getText(
	  new vscode.Range(position, document.lineAt(position.line).range.end)
	);
	return END_OF_LINE_VALID_REGEX.test(lineSuffix);
  }

async function backgroundInit(context: vscode.ExtensionContext) {
	const provider: vscode.InlineCompletionItemProvider = {
		async provideInlineCompletionItems(
			document: vscode.TextDocument,
			position: vscode.Position,
			context: vscode.InlineCompletionContext,
			token: vscode.CancellationToken
		) {
			// check if can change;
			// if (change === false) {
			// 	console.log("no change, not going to complete");
			// 	return undefined;
			// }

			console.log("isValidMidLinePosition", isValidMidlinePosition(document, position));

			const completionInfo = context.selectedCompletionInfo;
			if (completionInfo) {
				const { range, text } = completionInfo;
				console.log("range and text: " + range + " " + text)
			}

			console.log("inline complete...");
			const result: vscode.InlineCompletionList = {
				items: []
			};
			
			// const textBeforeCursor = document.getText();
			// console.log("textBeforeCursor " + textBeforeCursor);

			const currLineBeforeCursor = document.getText(
				new vscode.Range(position.with(undefined, 0), position)
			);
			console.log("currLineBeforeCursor " + currLineBeforeCursor);
			
			const offset = document.offsetAt(position);
			const beforeStartOffset = Math.max(0, offset - 100_000);
			const afterEndOffset = offset + 100_000;
			const beforeStart = document.positionAt(beforeStartOffset);
			const afterEnd = document.positionAt(afterEndOffset);
			console.log("pos: " + position.character + " " + completionInfo);
			console.log("offset" + " " + beforeStartOffset + " " + afterEndOffset + " " + beforeStart + " " + afterEnd);
			// console.log("before " + document.getText(new vscode.Range(beforeStart, position)));
			// console.log("after: " + document.getText(new vscode.Range(position, afterEnd)),)
			console.log("line: " + position.line);

			let request = {
				'before': document.getText(new vscode.Range(beforeStart, position)),
				'currLineBeforeCursor': currLineBeforeCursor,
				'after': document.getText(new vscode.Range(position, afterEnd)),
				'line': position.line,
				'fileName': document.fileName
			}
			readableStream.push(JSON.stringify(request));

			console.log("aaaaaaa " + results)

			// results = [
			// 	" dummy suggestion comment1",
			// 	" different suggestion comment2"
			// ];

			const delay = (ms: number | undefined) => new Promise(resolve => setTimeout(resolve, ms))
			let retry = 0;
			while (results.length === 0 && retry++ < 30) {
				console.log("waiting for result....");
				await delay(500);
			}

			results.forEach(r => {

				let response = JSON.parse(r);
				let prefixLen = response.prefixLen;
				let complete = response.complete;

				console.log("positions: ", position.line, prefixLen, position.line, document.lineAt(position.line).text.length);


				result.items.push({
					insertText: complete,
					range: new vscode.Range(position.line, prefixLen, position.line, document.lineAt(position.line).text.length),
				});
			})
			
			console.log("result len: " + result.items.length);

			results = [];
			return result;
		},
	};
	context.subscriptions.push(
		vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, provider), 
		...tracker
	);
}

export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "CodeMaker" is now active!');

	const token = vscode.workspace.getConfiguration().get('codemaker.apiKey') as string;
	const codeMakerService = new CodemakerService(token);

	void backgroundInit(context);

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