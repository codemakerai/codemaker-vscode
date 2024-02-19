// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import { Language, UnsupportedLanguageError } from 'codemaker-sdk';

const languages = new Map<string, Language>([
    ["c", Language.c],
    ["cpp", Language.cpp],
    ["cxx", Language.cpp],
    ["js", Language.javascript],
    ["jsx", Language.javascript],
    ["php", Language.php],
    ["java", Language.java],
    ["cs", Language.csharp],
    ["go", Language.go],
    ["kt", Language.kotlin],
    ["ts", Language.typescript],
    ["tsx", Language.typescript],    
    ["rs", Language.rust],
]);

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