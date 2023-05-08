// Copyright 2023 CodeMaker AI Inc. All rights reserved.

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import {
    CreateProcessRequest,
    CreateProcessResponse,
    GetProcessOutputRequest,
    GetProcessOutputResponse,
    GetProcessStatusRequest,
    GetProcessStatusResponse
} from './model/Model';
import { AuthenticationError } from './Errors';

class Client {
    private static readonly apiEndpoint = 'https://api.codemaker.ai';

    private client: AxiosInstance;

    constructor(private readonly apiKey: string) {
        this.client = axios.create({
            baseURL: Client.apiEndpoint,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-type': 'application/json',
                'User-Agent': 'CodeMakerSDKJavaScript/1.1.0'
            },
        });
    }

    createProcess(body: CreateProcessRequest): Promise<AxiosResponse<CreateProcessResponse>> {
        return this.doPost<CreateProcessResponse>('/process',  body);
    }

    getProcessStatus(body: GetProcessStatusRequest): Promise<AxiosResponse<GetProcessStatusResponse>> {
        return this.doPost<GetProcessStatusResponse>('/process/status', body);
    }

    getProcessOutput(body: GetProcessOutputRequest): Promise<AxiosResponse<GetProcessOutputResponse>> {
        return this.doPost<GetProcessOutputResponse>('/process/output', body);
    }

    async doPost<T>(url: string, body: any): Promise<AxiosResponse<T>> {
        try {
            return await this.client.post<T>(url, body);
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
