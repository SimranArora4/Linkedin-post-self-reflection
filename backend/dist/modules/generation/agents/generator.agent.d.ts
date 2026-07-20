import { OpenaiService } from '../services/openai.service';
export interface GeneratorOutput {
    draft: string;
    reasoning: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    cost: number;
    latencyMs: number;
}
export declare class GeneratorAgent {
    private readonly openaiService;
    private readonly logger;
    constructor(openaiService: OpenaiService);
    run(topic: string, audience: string, tone: string, length: string, history?: string): Promise<GeneratorOutput>;
}
