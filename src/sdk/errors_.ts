// Copyright 2023 CodeMaker AI Inc. All rights reserved.

class AuthenticationError extends Error {

    constructor(msg: string) {
        super(msg);
    }
}

class UnsupportedLanguageError extends Error {

    constructor(lang: string | undefined) {
        super(lang + " is not supported yet");
    }
}

export { AuthenticationError, UnsupportedLanguageError };