const vscode = window.acquireVsCodeApi();

window.addEventListener('message', handleEvent);

document.addEventListener('DOMContentLoaded', initializeChat);

function handleEvent(event) {
    const message = event.data;
    switch (message.command) {
        case 'assistantRespondAdded':
            handleAssistantResponse(message.result.message);
            break;
        case 'assistantRespondError':
            handleAssistantResponse(message.error);
            break;
    }
    updateSubmitButton(false);
}

function initializeChat() {
    const chatbox = document.querySelector('#chatbox');
    const inputForm = document.querySelector('#inputForm');
    const inputField = document.querySelector('#inputField');

    inputForm.addEventListener('submit', (e) => handleSubmit(e, inputField));
}

function handleSubmit(e, inputField) {
    e.preventDefault();
    const message = inputField.value;
    if (message.trim()) {
        addMessage(message, 'User');
        vscode.postMessage({
            command: 'assistantRequest',
            text: message
        });
        updateSubmitButton(true);
    }
    inputField.value = '';
    addPendingMessage();
}

function handleAssistantResponse(completionResult) {
    if (completionResult) {
        addMessage(completionResult, 'CODEMAKER AI');
    } else {
        addMessage('No response from Assistant', 'Assistant');
    }
}

function updateSubmitButton(disabled) {
    const submitButton = document.querySelector('#submitButton');
    submitButton.disabled = disabled;
    submitButton.innerHTML = disabled ? "..." : "Send";
}

function addPendingMessage() {
    const messageElement = createMessageElement("Assistant", true);
    appendMessageElement(messageElement);
}

function addPendingMessage() {
    const messageElement = document.createElement('div');
    messageElement.setAttribute('data-username', "CODEMAKER AI");
    messageElement.classList.add('message');
    messageElement.classList.add('pending');
    messageElement.innerHTML = `
        <div class="loader">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;
    chatbox.appendChild(messageElement);
    chatbox.scrollTop = chatbox.scrollHeight;
}

function removePendingMessage() {
    const pendingMessage = document.querySelector('.message.pending');
    if (pendingMessage) {
        pendingMessage.remove();
    }
}

function addMessage(markdownText, sender) {
    removePendingMessage();
    const messageElement = createMessageElement(sender);
    messageElement.innerHTML = marked.parse(markdownText);
    appendMessageElement(messageElement);
    renderMarkdown();
    addCopyButtonToCodeBlocks();
}

function createMessageElement(sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.setAttribute('data-username', sender);
    return messageElement;
}

function appendMessageElement(messageElement) {
    const chatbox = document.querySelector('#chatbox');
    chatbox.appendChild(messageElement);
    chatbox.scrollTop = chatbox.scrollHeight;
}

function renderMarkdown() {
    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        }
    });
    document.querySelectorAll('.message pre code').forEach((block) => {
        hljs.highlightBlock(block);
    });
}

function addCopyButtonToCodeBlocks() {
    var snippets = document.getElementsByTagName('pre');
    var numberOfSnippets = snippets.length;
    for (var i = 0; i < numberOfSnippets; i++) {
        var code = snippets[i].getElementsByTagName('code')[0].innerText;
        if (!snippets[i].getElementsByClassName('hljs-copy')[0]) {
            snippets[i].classList.add('hljs');
            snippets[i].innerHTML = '<button class="hljs-copy">Copy</button>' + snippets[i].innerHTML; 
            snippets[i].getElementsByClassName('hljs-copy')[0].addEventListener("click", (function(code) {
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
