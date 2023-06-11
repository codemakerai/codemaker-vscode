import { Language } from '../sdk/model/model';
import { UnsupportedLanguageError } from '../sdk/errors';

export function langFromFileExtension(fileName: string): Language {
    const ext = fileName.split('.').pop();
    switch (ext) {
        case 'java':
            return Language.java;
        case 'js':
        case 'jsx':
            return Language.javascript;
        case 'kt':
            return Language.kotlin;
        case 'go':
            return Language.go;
        default:
            console.info("unsupported language: " + ext);
            throw new UnsupportedLanguageError(ext);
    }
}