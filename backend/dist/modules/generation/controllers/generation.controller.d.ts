import { GenerationService } from '../services/generation.service';
import type { GeneratePostDto } from '../dto/generate-post.dto';
export declare class GenerationController {
    private readonly generationService;
    constructor(generationService: GenerationService);
    generate(dto: GeneratePostDto, sync?: string): Promise<{
        finalDraft: string;
        iterations: number;
        scores: any[];
        reflections: {
            iteration: any;
            strengths: any;
            weaknesses: any;
            suggestions: any;
        }[];
        totalCost: number;
        latency: string;
    } | {
        jobId: string;
    }>;
    getStatus(jobId: string): Promise<{
        id: string;
        status: string;
        finalDraft: string | undefined;
        iterations: any[];
        totalCost: number;
        latencyMs: number;
        totalTokens: {
            prompt: number;
            completion: number;
        };
        error: string | undefined;
    }>;
}
