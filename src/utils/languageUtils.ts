// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import { Language } from '../sdk/model/model';
import { UnsupportedLanguageError } from '../sdk/errors';

const languages = new Map<string, Language>([
    ["java", Language.java],
    ["js", Language.javascript],
    ["jsx", Language.javascript],
    ["ts", Language.typescript],
    ["tsx", Language.typescript],
    ["kt", Language.kotlin],
    ["go", Language.go],
    ["cs", Language.csharp],
])

export function isFileSupported(fileName: string): boolean {
    const ext = fileName.split('.').pop();
    return !!ext && languages.has(ext);
}

export function langFromFileExtension(fileName: string): Language {
    const ext = fileName.split('.').pop();
    if (!ext) {
        throw new UnsupportedLanguageError("Could not determine file language " + fileName);
    }
    const language = languages.get(ext);
    if (!language) {
        throw new UnsupportedLanguageError("Language is not supported for file with extension " + ext);
    }
    return language;
}