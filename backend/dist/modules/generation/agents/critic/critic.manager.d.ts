import { ICritic, CriticResponse } from './critic.interface';
export declare class CriticManager {
    private readonly critics;
    private readonly logger;
    constructor(critics: ICritic[]);
    runAll(draft: string, context: {
        topic: string;
        audience: string;
        tone: string;
        minScore: number;
    }): Promise<CriticResponse>;
}
