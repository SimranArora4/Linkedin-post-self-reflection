import { OpenaiService } from '../services/openai.service';
export interface SelfReflectionOutput {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    rewrittenDraft: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    cost: number;
    latencyMs: number;
}
export declare class SelfReflectionAgent {
    private readonly openaiService;
    private readonly logger;
    constructor(openaiService: OpenaiService);
    run(draft: string, reasoning: string): Promise<SelfReflectionOutput>;
}
