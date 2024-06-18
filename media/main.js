const vscode = window.acquireVsCodeApi();

window.addEventListener('message', handleEvent);

document.addEventListener('DOMContentLoaded', initializeChat);

function handleEvent(event) {
    const message = event.data;
    switch (message.command) {
        case 'assistantRespondAdded':
            handleAssistantResponse(message.result);
            break;
        case 'assistantError':
            handleAssistantError(message.error);
            break;
    }
    updateSubmitButton(false);
}

function initializeChat() {
    const chatbox = document.querySelector('#chatbox');
    const inputForm = document.querySelector('#inputForm');
    const inputField = document.querySelector('#inputField');

    inputForm.addEventListener('submit', (e) => handleSubmit(e, inputField));

    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        }
    });
}

function handleSubmit(e, inputField) {
    e.preventDefault();
    const message = inputField.value;
    if (message.trim()) {
        addMessage('User', {message});
        vscode.postMessage({
            command: 'assistantRequest',
            text: message
        });
        updateSubmitButton(true);
    }
    inputField.value = '';
    addPendingMessage();
}

function handleAssistantResponse(completion) {
    if (completion) {
        addMessage('Assistant', completion);
    } else {
        addMessage('Assistant', {message: 'No response from Assistant'});
    }
}

function handleAssistantError(error) {
    addMessage('Assistant', {message: error});
}

function updateSubmitButton(disabled) {
    const submitButton = document.querySelector('#submitButton');
    submitButton.disabled = disabled;
    submitButton.innerHTML = disabled ? "..." : "Send";
}

function addPendingMessage() {
    const cardElement = document.createElement('div');
    cardElement.classList.add('card');

    const messageElement = document.createElement('div');
    cardElement.appendChild(messageElement);

    messageElement.setAttribute('data-username', "Assistant");
    messageElement.classList.add('message');
    messageElement.classList.add('pending');
    messageElement.innerHTML = `
        <div class="loader">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;
    chatbox.appendChild(cardElement);
    chatbox.scrollTop = chatbox.scrollHeight;
}

function removePendingMessage() {
    const pendingMessage = document.querySelector('.message.pending');
    if (pendingMessage) {
        pendingMessage.remove();
    }
}

function addMessage(sender, message) {
    removePendingMessage();

    const messageElement = createMessageElement(sender, message);
    
    appendMessageElement(messageElement);
}

function createMessageElement(sender, message) {
    const cardElement = document.createElement('div');
    cardElement.classList.add('card');

    const messageElement = document.createElement('div');
    cardElement.appendChild(messageElement);

    messageElement.classList.add('message');
    messageElement.setAttribute('data-username', sender);
    messageElement.innerHTML = marked.parse(message.message);

    renderMarkdown(messageElement);
    addCopyButtonToCodeBlocks(messageElement);

    if (isAssistant(sender)) {
        const controlsElement = document.createElement('div');
        cardElement.appendChild(controlsElement);

        const upVoteButtonElement = document.createElement('img');
        upVoteButtonElement.classList.add('icon');
        upVoteButtonElement.src = window.resolveMediaFile("thumbs-up-off.svg");        
        controlsElement.appendChild(upVoteButtonElement);

        const downVoteButtonElement = document.createElement('img');
        downVoteButtonElement.classList.add('icon');
        downVoteButtonElement.src = window.resolveMediaFile("thumbs-down-off.svg");
        controlsElement.appendChild(downVoteButtonElement);
        
        const copyButtonElement = document.createElement('img');
        copyButtonElement.classList.add('icon');
        copyButtonElement.src = window.resolveMediaFile("copy-off.svg");
        controlsElement.appendChild(copyButtonElement);

        upVoteButtonElement.addEventListener('click', function(event) {
            vscode.postMessage({
                command: 'assistantFeedback',
                sessionId: message.sessionId,
                messageId: message.messageId,
                vote: "UP_VOTE"
            });
            upVoteButtonElement.src = window.resolveMediaFile("thumbs-up.svg");
            downVoteButtonElement.src = window.resolveMediaFile("thumbs-down-off.svg");
        });
        downVoteButtonElement.addEventListener('click', function(event) {
            vscode.postMessage({
                command: 'assistantFeedback',
                sessionId: message.sessionId,
                messageId: message.messageId,
                vote: "DOWN_VOTE"
            });
            upVoteButtonElement.src = window.resolveMediaFile("thumbs-up-off.svg");
            downVoteButtonElement.src = window.resolveMediaFile("thumbs-down.svg");            
        });
        copyButtonElement.addEventListener('click', function(event) {
            vscode.postMessage({
                command: 'copyToClipboard',
                text: message.message
            });
            copyButtonElement.src = window.resolveMediaFile("copy.svg");
            setTimeout(function() {
                copyButtonElement.src = window.resolveMediaFile("copy-off.svg");
            }, 500);
        });
    }

    return cardElement;
}

function appendMessageElement(messageElement) {
    const chatbox = document.querySelector('#chatbox');
    chatbox.appendChild(messageElement);
    chatbox.scrollTop = chatbox.scrollHeight;
}

function renderMarkdown(element) {
    element.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
    });
}

function addCopyButtonToCodeBlocks(element) {
    const codeBlocks = element.getElementsByTagName('pre');
    const length = codeBlocks.length;
    for (var i = 0; i < length; i++) {
        var code = codeBlocks[i].getElementsByTagName('code')[0].innerText;
        if (!codeBlocks[i].getElementsByClassName('hljs-copy')[0]) {
            codeBlocks[i].classList.add('hljs');
            codeBlocks[i].innerHTML = '<button class="hljs-copy">Copy</button>' + codeBlocks[i].innerHTML; 
            codeBlocks[i].getElementsByClassName('hljs-copy')[0].addEventListener("click", (function(code) {
                return function(event) {
                    vscode.postMessage({
                        command: 'copyToClipboard',
                        text: code
                    });
                    var button = event.target;
                    button.innerHTML = "&#10003;"; 
                    button.classList.add('hljs-copied');
                    setTimeout(function() {
                        button.innerHTML = "";
                        button.classList.remove('hljs-copied');
                    }, 1000);
                };
            })(code));
        }
    }
}

function isAssistant(sender) {
    return sender === 'Assistant';
}
