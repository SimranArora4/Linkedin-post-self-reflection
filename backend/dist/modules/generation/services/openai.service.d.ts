import { ConfigService } from '@nestjs/config';
interface ChatCompletionResult<T> {
    data: T;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    cost: number;
    latencyMs: number;
}
export declare class OpenaiService {
    private readonly configService;
    private readonly logger;
    private readonly openai;
    private readonly model;
    private readonly temperature;
    private readonly inputTokenCost;
    private readonly outputTokenCost;
    constructor(configService: ConfigService);
    callChatCompletion<T = any>(systemPrompt: string, userPrompt: string, jsonMode?: boolean): Promise<ChatCompletionResult<T>>;
}
export {};
