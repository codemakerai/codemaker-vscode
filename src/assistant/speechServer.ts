import * as http from 'http';
import {parse}  from 'url';

import CodemakerService from '../service/codemakerService';

export default class SpeechServer {

    private readonly codemakerSerivce: CodemakerService;    

    private readonly host = 'localhost';

    private port: number = 52010;

    private server?: http.Server;

    constructor(codemakerService: CodemakerService) {
        this.codemakerSerivce = codemakerService;
    }

    start() {
        const requestListener = (req: http.IncomingMessage, res: http.ServerResponse) => {
            const url = parse(req.url!, true);
            this.codemakerSerivce.assistantSpeech(url.query['input'] as string).then((result) => {                                
                res.setHeader('Content-Type', 'audio/mp3');
                res.writeHead(200);
                res.write(result.audio);
                res.end();
            }).catch((err) => {
                console.log(err);
                res.writeHead(500);
                res.end();
            });
        };

        this.server = http.createServer(requestListener);
        this.server.listen(this.port, this.host, () => {
            console.log(`Server is running on http://${this.host}:${this.port}`);
        });
    }

    url() {
        return `http://${this.host}:${this.port}`;
    }
}