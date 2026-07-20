import { ConfigService } from '@nestjs/config';
import { GeneratePostDto } from '../dto/generate-post.dto';
import { GenerationWorkflow } from '../workflows/generation.workflow';
import { SocketGateway } from '../../socket/socket.gateway';
export declare class GenerationService {
    private readonly generationWorkflow;
    private readonly configService;
    private readonly socketGateway;
    private readonly logger;
    private readonly defaultMaxIterations;
    private readonly minScore;
    private readonly jobs;
    constructor(generationWorkflow: GenerationWorkflow, configService: ConfigService, socketGateway: SocketGateway);
    createJob(dto: GeneratePostDto): Promise<{
        jobId: string;
    }>;
    private runWorkflowBackground;
    getJobStatus(jobId: string): Promise<{
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
    } | null>;
    generateSync(dto: GeneratePostDto): Promise<{
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
    }>;
}
