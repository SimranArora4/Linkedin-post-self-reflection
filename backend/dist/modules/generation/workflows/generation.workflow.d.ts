import { ConfigService } from '@nestjs/config';
import { GeneratorAgent } from '../agents/generator.agent';
import { SelfReflectionAgent } from '../agents/self-reflection.agent';
import { CriticManager } from '../agents/critic/critic.manager';
export interface WorkflowState {
    topic: string;
    audience: string;
    tone: string;
    length: string;
    currentIteration: number;
    maxIterations: number;
    currentDraft: string;
    generatorReasoning: string;
    selfReflection: {
        strengths: string[];
        weaknesses: string[];
        suggestions: string[];
        rewrittenDraft: string;
    };
    critic: {
        score: number;
        passed: boolean;
        feedback: string[];
        improvements: string[];
    };
    history: Array<{
        iteration: number;
        draft: string;
        reflection: string;
        criticFeedback: string;
    }>;
    totalTokens: {
        prompt: number;
        completion: number;
    };
    totalCost: number;
    latencyMs: number;
    jobId: string;
    status: 'generating' | 'reflecting' | 'critiquing' | 'completed' | 'failed';
}
export declare const WorkflowStateAnnotation: import("@langchain/langgraph").AnnotationRoot<{
    topic: import("@langchain/langgraph").LastValue<string>;
    audience: import("@langchain/langgraph").LastValue<string>;
    tone: import("@langchain/langgraph").LastValue<string>;
    length: import("@langchain/langgraph").LastValue<string>;
    currentIteration: import("@langchain/langgraph").LastValue<number>;
    maxIterations: import("@langchain/langgraph").LastValue<number>;
    currentDraft: import("@langchain/langgraph").LastValue<string>;
    generatorReasoning: import("@langchain/langgraph").LastValue<string>;
    selfReflection: import("@langchain/langgraph").LastValue<any>;
    critic: import("@langchain/langgraph").LastValue<any>;
    history: import("@langchain/langgraph").LastValue<any[]>;
    totalTokens: import("@langchain/langgraph").LastValue<any>;
    totalCost: import("@langchain/langgraph").LastValue<number>;
    latencyMs: import("@langchain/langgraph").LastValue<number>;
    jobId: import("@langchain/langgraph").LastValue<string>;
    status: import("@langchain/langgraph").LastValue<string>;
}>;
export declare class GenerationWorkflow {
    private readonly generatorAgent;
    private readonly reflectionAgent;
    private readonly criticManager;
    private readonly configService;
    private readonly logger;
    constructor(generatorAgent: GeneratorAgent, reflectionAgent: SelfReflectionAgent, criticManager: CriticManager, configService: ConfigService);
    build(onStepUpdate?: (stepName: string, state: Partial<typeof WorkflowStateAnnotation.State>) => void): import("@langchain/langgraph").CompiledStateGraph<{
        topic: string;
        audience: string;
        tone: string;
        length: string;
        currentIteration: number;
        maxIterations: number;
        currentDraft: string;
        generatorReasoning: string;
        selfReflection: any;
        critic: any;
        history: any[];
        totalTokens: any;
        totalCost: number;
        latencyMs: number;
        jobId: string;
        status: string;
    }, {
        topic?: string | undefined;
        audience?: string | undefined;
        tone?: string | undefined;
        length?: string | undefined;
        currentIteration?: number | undefined;
        maxIterations?: number | undefined;
        currentDraft?: string | undefined;
        generatorReasoning?: string | undefined;
        selfReflection?: any;
        critic?: any;
        history?: any[] | undefined;
        totalTokens?: any;
        totalCost?: number | undefined;
        latencyMs?: number | undefined;
        jobId?: string | undefined;
        status?: string | undefined;
    }, "generator" | "reflection" | "loop" | "__start__" | "criticNode", {
        topic: import("@langchain/langgraph").LastValue<string>;
        audience: import("@langchain/langgraph").LastValue<string>;
        tone: import("@langchain/langgraph").LastValue<string>;
        length: import("@langchain/langgraph").LastValue<string>;
        currentIteration: import("@langchain/langgraph").LastValue<number>;
        maxIterations: import("@langchain/langgraph").LastValue<number>;
        currentDraft: import("@langchain/langgraph").LastValue<string>;
        generatorReasoning: import("@langchain/langgraph").LastValue<string>;
        selfReflection: import("@langchain/langgraph").LastValue<any>;
        critic: import("@langchain/langgraph").LastValue<any>;
        history: import("@langchain/langgraph").LastValue<any[]>;
        totalTokens: import("@langchain/langgraph").LastValue<any>;
        totalCost: import("@langchain/langgraph").LastValue<number>;
        latencyMs: import("@langchain/langgraph").LastValue<number>;
        jobId: import("@langchain/langgraph").LastValue<string>;
        status: import("@langchain/langgraph").LastValue<string>;
    }, {
        topic: import("@langchain/langgraph").LastValue<string>;
        audience: import("@langchain/langgraph").LastValue<string>;
        tone: import("@langchain/langgraph").LastValue<string>;
        length: import("@langchain/langgraph").LastValue<string>;
        currentIteration: import("@langchain/langgraph").LastValue<number>;
        maxIterations: import("@langchain/langgraph").LastValue<number>;
        currentDraft: import("@langchain/langgraph").LastValue<string>;
        generatorReasoning: import("@langchain/langgraph").LastValue<string>;
        selfReflection: import("@langchain/langgraph").LastValue<any>;
        critic: import("@langchain/langgraph").LastValue<any>;
        history: import("@langchain/langgraph").LastValue<any[]>;
        totalTokens: import("@langchain/langgraph").LastValue<any>;
        totalCost: import("@langchain/langgraph").LastValue<number>;
        latencyMs: import("@langchain/langgraph").LastValue<number>;
        jobId: import("@langchain/langgraph").LastValue<string>;
        status: import("@langchain/langgraph").LastValue<string>;
    }, import("@langchain/langgraph").StateDefinition, {
        generator: {
            currentDraft: string;
            generatorReasoning: string;
            totalTokens: {
                prompt: any;
                completion: any;
            };
            totalCost: number;
            latencyMs: number;
            status: "generating";
        };
        reflection: {
            selfReflection: {
                strengths: string[];
                weaknesses: string[];
                suggestions: string[];
                rewrittenDraft: string;
            };
            totalTokens: {
                prompt: any;
                completion: any;
            };
            totalCost: number;
            latencyMs: number;
            status: "reflecting";
        };
        criticNode: {
            critic: {
                score: number;
                passed: boolean;
                feedback: string[];
                improvements: string[];
            };
            currentDraft: any;
            totalTokens: {
                prompt: any;
                completion: any;
            };
            totalCost: number;
            latencyMs: number;
            status: "critiquing";
        };
        loop: {
            history: any[];
            currentIteration: number;
        };
    }, unknown, unknown, []>;
}
