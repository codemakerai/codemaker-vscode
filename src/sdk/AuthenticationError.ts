// Copyright 2023 CodeMaker AI Inc. All rights reserved.

class AuthenticationError extends Error {

    constructor(msg: string) {
        super(msg);
    }
}

export default AuthenticationError;