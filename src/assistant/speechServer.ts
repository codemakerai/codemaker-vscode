import * as http from 'http';
import {parse}  from 'url';

import CodemakerService from '../service/codemakerService';

export default class SpeechServer {

    private readonly codemakerSerivce: CodemakerService;    

    private readonly host = 'localhost';

    private port: number = 52020;

    private server?: http.Server;

    constructor(codemakerService: CodemakerService) {
        this.codemakerSerivce = codemakerService;
    }

    start() {
        const requestListener = (req: http.IncomingMessage, res: http.ServerResponse) => {
            const url = parse(req.url!, true);
            const input = Buffer.from(url.query['input'] as string, 'base64url').toString('utf-8');

            res.setHeader('Content-Type', 'audio/mp3');

            const stream = this.codemakerSerivce.assistantSpeechStream(input);
            stream.on('data', (data) => {
                res.write(data.audio);
            });
            stream.on('error', (e) => {
                res.statusCode = 500;
            });
            stream.on('end', () => {
                res.end();
            });
        };

        this.server = http.createServer(requestListener);
        this.server.listen(this.port, this.host);
    }

    url() {
        return `http://${this.host}:${this.port}`;
    }
}