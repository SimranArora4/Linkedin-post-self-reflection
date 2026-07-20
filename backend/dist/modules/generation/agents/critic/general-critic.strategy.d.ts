import { ICritic, CriticResponse } from './critic.interface';
import { OpenaiService } from '../../services/openai.service';
export declare class GeneralCritic implements ICritic {
    private readonly openaiService;
    readonly name = "General Critic";
    private readonly logger;
    constructor(openaiService: OpenaiService);
    evaluate(draft: string, context: {
        topic: string;
        audience: string;
        tone: string;
        minScore: number;
    }): Promise<CriticResponse>;
}
