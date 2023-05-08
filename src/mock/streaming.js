const WebSocket = require('ws');
const fs = require("fs");

const ws = new WebSocket('ws://localhost:8080');

const duplex = WebSocket.createWebSocketStream(ws, { encoding: 'utf8' });

duplex.on('error', console.error);

const Stream = require('stream')

let count = 0;
const readableStream = new Stream.Readable({
    read(size) {
        
    }
});

duplex.pipe(process.stdout);
readableStream.pipe(duplex);

readableStream.push("test");