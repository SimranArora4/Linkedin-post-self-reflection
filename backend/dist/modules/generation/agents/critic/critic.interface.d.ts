export interface CriticResponse {
    score: number;
    passed: boolean;
    feedback: string[];
    improvements: string[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    cost?: number;
    latencyMs?: number;
}
export interface ICritic {
    readonly name: string;
    evaluate(draft: string, context: {
        topic: string;
        audience: string;
        tone: string;
        minScore: number;
    }): Promise<CriticResponse>;
}
export declare const CRITIC_TOKEN = "ICritic";
