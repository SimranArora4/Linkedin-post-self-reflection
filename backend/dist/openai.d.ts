export interface ChatCompletionResult<T> {
    data: T;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    cost: number;
    latencyMs: number;
}
export declare function callChatCompletion<T = any>(systemPrompt: string, userPrompt: string, jsonMode?: boolean): Promise<ChatCompletionResult<T>>;
