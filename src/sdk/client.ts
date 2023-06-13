// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import {
    CreateProcessRequest,
    CreateProcessResponse,
    GetProcessOutputRequest,
    GetProcessOutputResponse,
    GetProcessStatusRequest,
    GetProcessStatusResponse
} from './model/model';
import { AuthenticationError } from './errors';

export class Client {
    private static readonly apiEndpoint = 'https://api.codemaker.ai';

    private client: AxiosInstance;

    constructor(private readonly apiKeyProvider: () => string) {
        this.client = axios.create({
            baseURL: Client.apiEndpoint,
            headers: {
                'Content-type': 'application/json',
                'User-Agent': 'CodeMakerSDKJavaScript/1.7.0'
            },
        });
    }

    createProcess(body: CreateProcessRequest): Promise<AxiosResponse<CreateProcessResponse>> {
        return this.doPost<CreateProcessResponse>('/process', body);
    }

    getProcessStatus(body: GetProcessStatusRequest): Promise<AxiosResponse<GetProcessStatusResponse>> {
        return this.doPost<GetProcessStatusResponse>('/process/status', body);
    }

    getProcessOutput(body: GetProcessOutputRequest): Promise<AxiosResponse<GetProcessOutputResponse>> {
        return this.doPost<GetProcessOutputResponse>('/process/output', body);
    }

    async doPost<T>(url: string, body: any): Promise<AxiosResponse<T>> {
        try {
            return await this.client.post<T>(url, body, {
                headers: {
                    'Authorization': `Bearer ${this.apiKeyProvider()}`,
                }
            });
        } catch (err) {
            const error = err as AxiosError | Error;
            if (!axios.isAxiosError(error)) {
                throw new Error("Request failed " + error.message);
            } else {
                if (error.response && error.response.status === 401) {
                    throw new AuthenticationError("Unauthorized request");
                } else {
                    throw new Error("Error " + error.message);
                }
            }
        }
    }
}

export default Client;
