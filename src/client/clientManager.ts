import { Client } from "codemaker-sdk";
import { Configuration } from '../configuration/configuration';

class Holder {
    readonly endpoint: string | null;
    readonly client: Client;

    constructor(endpoint: string | null, client: Client) {
        this.endpoint = endpoint;
        this.client = client;
    }
}

export class ClientManager {

    private static readonly defaultMaxRetries = 10;

    private holder: Holder | null = null;

    getClient(endpoint: string | null) {
        let instance = this.holder;
        if (!instance || instance.endpoint !== endpoint) {            
            this.holder = new Holder(endpoint, new Client(() => Configuration.apiKey(), {
                endpoint: endpoint && endpoint.length > 0 ? endpoint : null,
                maxRetries: ClientManager.defaultMaxRetries
            }));
        }
        return this.holder!!.client;
    }
}