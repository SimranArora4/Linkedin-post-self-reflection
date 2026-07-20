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
        score: number;
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
export interface CriticStrategy {
    name: string;
    evaluate: (draft: string, context: {
        topic: string;
        audience: string;
        tone: string;
        minScore: number;
    }) => Promise<any>;
}
export declare const registeredCritics: CriticStrategy[];
export declare function buildWorkflow(onStepUpdate?: (stepName: string, state: Partial<typeof WorkflowStateAnnotation.State>) => void, minScoreConfig?: number): import("@langchain/langgraph").CompiledStateGraph<{
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
}, "__start__" | "generator" | "criticNode" | "reflection" | "loop", {
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
        currentDraft: any;
        generatorReasoning: any;
        totalTokens: {
            prompt: number;
            completion: number;
        };
        totalCost: number;
        latencyMs: number;
        status: "generating";
    };
    criticNode: {
        critic: {
            score: number;
            passed: boolean;
            feedback: string[];
            improvements: string[];
        };
        totalTokens: any;
        totalCost: number;
        latencyMs: number;
        status: "critiquing";
    };
    reflection: {
        selfReflection: {
            strengths: any;
            weaknesses: any;
            suggestions: any;
            rewrittenDraft: any;
        };
        totalTokens: {
            prompt: any;
            completion: any;
        };
        totalCost: number;
        latencyMs: number;
        status: "reflecting";
    };
    loop: {
        history: any[];
        currentDraft: any;
        currentIteration: number;
    };
}, unknown, unknown, []>;
