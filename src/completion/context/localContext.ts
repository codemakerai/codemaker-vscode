// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import * as vscode from 'vscode';
import * as path from 'path';
import { CodeSnippetContext } from 'codemaker-sdk';

const MAX_SIDE_TABS = 20;
const LAST_N_LINES = 30;
const JACCARD_WINDOW_SIZE = 30;
const MAX_LINE_COUNT = 1000;
const MAX_SCORE = 0.95;
const MAX_SNIPPET_COUNT = 5;
const NON_WORD_REGEX = /[^\w]+/;
const LINE_BREAK_REGEX = /\r?\n/;

type FileContent = {
    uri: vscode.Uri;
    content: string;
};

type JaccardDistanceMatch = {
    score: number,
    match: string
};

export async function getLocalCodeSnippetContexts(): Promise<CodeSnippetContext[]> {

    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return [];
    }

    const { document, selection } = activeEditor;

    const prefixRange = new vscode.Range(new vscode.Position(0, 0), selection.active);
    const prefix = document.getText(prefixRange);

    const lines = prefix.split(LINE_BREAK_REGEX);
    const lastNLines = lines.slice(Math.max(lines.length - LAST_N_LINES, 0));
    const prefixContent = lastNLines.join('\n');

    const fileContents: FileContent[] = await getRelevantFileContents(document);

    const codeSnippetContexts: CodeSnippetContext[] = [];

    for (const { uri, content } of fileContents) {
        const bestWindow = findBestJaccardMatchWindow(prefixContent, content, JACCARD_WINDOW_SIZE);

        if (uri.fsPath === document.uri.fsPath || bestWindow.score > MAX_SCORE) {
            continue;
        }
        const relativeFilePath = path.normalize(vscode.workspace.asRelativePath(uri.fsPath));
        
        codeSnippetContexts.push({
            language: path.extname(relativeFilePath).slice(1),
            snippet: bestWindow.match,
            relativePath: relativeFilePath,
            score: bestWindow.score
        });
    }
    codeSnippetContexts.sort((a, b) => a.score - b.score);
    codeSnippetContexts.splice(MAX_SNIPPET_COUNT);

    return codeSnippetContexts;
}

async function getRelevantFileContents(document: vscode.TextDocument): Promise<FileContent[]> {

    const allTabs: vscode.Uri[] = await vscode.window.tabGroups.all
        .flatMap(({ tabs }) => tabs.map(tab => (tab.input as any)?.uri))
        .filter(Boolean) as vscode.Uri[];

    const currentTabIndex = allTabs.findIndex(uri => uri?.toString() === document.uri.toString());

    if (currentTabIndex === -1) {
        return [];
    }

    let nearbyTabs: vscode.Uri[];

    if (allTabs.length <= 2 * MAX_SIDE_TABS + 1) {
        nearbyTabs = allTabs.filter((_, index) => index !== currentTabIndex);
    } else {
        const leftTabs: vscode.Uri[] = allTabs.slice(0, currentTabIndex).reverse();
        const rightTabs: vscode.Uri[] = allTabs.slice(currentTabIndex + 1);

        let leftCount = Math.min(MAX_SIDE_TABS, leftTabs.length);
        let rightCount = Math.min(MAX_SIDE_TABS, rightTabs.length);
        if (leftCount < MAX_SIDE_TABS && leftCount + rightCount < 2 * MAX_SIDE_TABS) {
            rightCount = Math.min(rightTabs.length, 2 * MAX_SIDE_TABS - leftCount);
        }
        if (rightCount < MAX_SIDE_TABS && leftCount + rightCount < 2 * MAX_SIDE_TABS) {
            leftCount = Math.min(leftTabs.length, 2 * MAX_SIDE_TABS - rightCount);
        }

        const leftPriorityTabs = leftTabs.slice(0, leftCount);
        const rightPriorityTabs = rightTabs.slice(0, rightCount);

        nearbyTabs = [...leftPriorityTabs, ...rightPriorityTabs];
    }

    const fileContentsPromises = nearbyTabs.map(async uri => {
        const text = await vscode.workspace.openTextDocument(uri);
        const range = text.lineCount > MAX_LINE_COUNT ? new vscode.Range(0, 0, MAX_LINE_COUNT, 0) : undefined;
        const content = range ? text.getText(range) : text.getText();

        return { uri, content };
    });

    return Promise.all(fileContentsPromises);
}

// TODO: today we only pick one best match window from a file, we can pick multiple windows from a file in the future.
function findBestJaccardMatchWindow(targetText: string, matchText: string, windowSize: number): JaccardDistanceMatch {
    const targetLines = targetText.split(LINE_BREAK_REGEX);
    const matchLines = matchText.split(LINE_BREAK_REGEX);

    const targetBagOfWords = populateBagOfWords(targetLines);

    let minJaccardDistance = 1;
    let bestWindow: string[] = [];

    let matchSize = Math.max(0, matchLines.length - windowSize);

    for (let i = 0; i <= matchSize; i++) {
        const window = matchLines.slice(i, i + windowSize);
        const windowBagOfWords = populateBagOfWords(window);

        const jaccardDistance = computeJaccardDistance(targetBagOfWords, windowBagOfWords);

        if (jaccardDistance < minJaccardDistance) {
            minJaccardDistance = jaccardDistance;
            bestWindow = window;
        }
    }

    return { score: minJaccardDistance, match: bestWindow.join('\n') };
}

// TODO: consider split camel case words into multiple words.
function populateBagOfWords(lines: string[]): Map<string, number> {
    const bagOfWords = new Map<string, number>();

    for (const line of lines) {
        const words = line.split(NON_WORD_REGEX);
        for (const word of words) {
            const lowerCaseWord = word.toLowerCase();
            bagOfWords.set(lowerCaseWord, (bagOfWords.get(lowerCaseWord) ?? 0) + 1);
        }
    }

    return bagOfWords;
}

function computeJaccardDistance(
    targetBagOfWords: Map<string, number>,
    windowBagOfWords: Map<string, number>
): number {
    let intersection = 0;
    let union = 0;

    for (const [word, count] of windowBagOfWords.entries()) {
        if (targetBagOfWords.has(word)) {
            intersection += Math.min(count, targetBagOfWords.get(word)!);
        }
    }

    for (const [word, count] of targetBagOfWords.entries()) {
        union += Math.max(count, windowBagOfWords.get(word) || 0);
    }
    for (const [word, count] of windowBagOfWords.entries()) {
        if (!targetBagOfWords.has(word)) {
            union += count;
        }
    }

    return 1 - intersection / union;
}
