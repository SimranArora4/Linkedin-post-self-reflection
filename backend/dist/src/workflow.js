"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registeredCritics = exports.WorkflowStateAnnotation = void 0;
exports.buildWorkflow = buildWorkflow;
const langgraph_1 = require("@langchain/langgraph");
const openai_1 = require("./openai");
const prompts_1 = require("./prompts");
exports.WorkflowStateAnnotation = langgraph_1.Annotation.Root({
    topic: (0, langgraph_1.Annotation)(),
    audience: (0, langgraph_1.Annotation)(),
    tone: (0, langgraph_1.Annotation)(),
    length: (0, langgraph_1.Annotation)(),
    currentIteration: (0, langgraph_1.Annotation)(),
    maxIterations: (0, langgraph_1.Annotation)(),
    currentDraft: (0, langgraph_1.Annotation)(),
    generatorReasoning: (0, langgraph_1.Annotation)(),
    selfReflection: (0, langgraph_1.Annotation)(),
    critic: (0, langgraph_1.Annotation)(),
    history: (0, langgraph_1.Annotation)(),
    totalTokens: (0, langgraph_1.Annotation)(),
    totalCost: (0, langgraph_1.Annotation)(),
    latencyMs: (0, langgraph_1.Annotation)(),
    jobId: (0, langgraph_1.Annotation)(),
    status: (0, langgraph_1.Annotation)(),
});
const generalCritic = {
    name: 'General Critic',
    evaluate: async (draft, context) => {
        const prompt = (0, prompts_1.renderPrompt)(prompts_1.defaultTemplates.critic, {
            draft,
            topic: context.topic,
            audience: context.audience,
            tone: context.tone,
            minScore: context.minScore.toString(),
        });
        const systemPrompt = 'You are a professional social media manager and content reviewer.';
        const result = await (0, openai_1.callChatCompletion)(systemPrompt, prompt, true);
        return {
            score: result.data.score,
            passed: result.data.passed,
            feedback: result.data.feedback || [],
            improvements: result.data.improvements || [],
            usage: result.usage,
            cost: result.cost,
            latencyMs: result.latencyMs,
        };
    }
};
exports.registeredCritics = [generalCritic];
async function runAllCritics(draft, context) {
    if (exports.registeredCritics.length === 0) {
        return { score: 10, passed: true, feedback: [], improvements: [], cost: 0, latencyMs: 0 };
    }
    const startTime = Date.now();
    const evaluations = await Promise.all(exports.registeredCritics.map(async (critic) => {
        try {
            return await critic.evaluate(draft, context);
        }
        catch (error) {
            console.error(`Critic [${critic.name}] failed:`, error);
            return {
                score: 0,
                passed: false,
                feedback: [`Critic [${critic.name}] failed: ${error.message}`],
                improvements: ['Fix system configurations.'],
                cost: 0,
                latencyMs: 0,
            };
        }
    }));
    const totalDuration = Date.now() - startTime;
    let totalScore = 0;
    let overallPassed = true;
    const combinedFeedback = [];
    const combinedImprovements = [];
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalCost = 0;
    for (let i = 0; i < evaluations.length; i++) {
        const result = evaluations[i];
        const critic = exports.registeredCritics[i];
        totalScore += result.score;
        if (!result.passed) {
            overallPassed = false;
        }
        const prefix = `[${critic.name}]`;
        combinedFeedback.push(...result.feedback.map((f) => `${prefix} ${f}`));
        combinedImprovements.push(...result.improvements.map((imp) => `${prefix} ${imp}`));
        if (result.usage) {
            totalPromptTokens += result.usage.promptTokens;
            totalCompletionTokens += result.usage.completionTokens;
        }
        totalCost += result.cost || 0;
    }
    const averageScore = Number((totalScore / exports.registeredCritics.length).toFixed(2));
    return {
        score: averageScore,
        passed: overallPassed,
        feedback: combinedFeedback,
        improvements: combinedImprovements,
        usage: {
            promptTokens: totalPromptTokens,
            completionTokens: totalCompletionTokens,
            totalTokens: totalPromptTokens + totalCompletionTokens,
        },
        cost: totalCost,
        latencyMs: totalDuration,
    };
}
function buildWorkflow(onStepUpdate, minScoreConfig = 8) {
    const generatorNode = async (state) => {
        console.log(`[Job ${state.jobId}] Running generator node. Iteration: ${state.currentIteration}`);
        if (onStepUpdate) {
            onStepUpdate('generating', state);
        }
        let historyText = '';
        if (state.history && state.history.length > 0) {
            historyText = state.history
                .map((h) => `Iteration ${h.iteration} Draft:\n"""\n${h.draft}\n"""\nCritique:\n${h.criticFeedback}`)
                .join('\n\n');
        }
        const startTime = Date.now();
        const prompt = (0, prompts_1.renderPrompt)(prompts_1.defaultTemplates.generator, {
            topic: state.topic,
            audience: state.audience,
            tone: state.tone,
            length: state.length,
            history: historyText,
        });
        const systemPrompt = 'You are a helpful content creator specializing in social media growth.';
        const genResult = await (0, openai_1.callChatCompletion)(systemPrompt, prompt, true);
        const duration = Date.now() - startTime;
        return {
            currentDraft: genResult.data.draft,
            generatorReasoning: genResult.data.reasoning,
            totalTokens: {
                prompt: (state.totalTokens?.prompt || 0) + genResult.usage.promptTokens,
                completion: (state.totalTokens?.completion || 0) + genResult.usage.completionTokens,
            },
            totalCost: (state.totalCost || 0) + genResult.cost,
            latencyMs: (state.latencyMs || 0) + duration,
            status: 'generating',
        };
    };
    const reflectionNode = async (state) => {
        console.log(`[Job ${state.jobId}] Running self-reflection node.`);
        if (onStepUpdate) {
            onStepUpdate('reflecting', state);
        }
        const startTime = Date.now();
        const prompt = (0, prompts_1.renderPrompt)(prompts_1.defaultTemplates.reflection, {
            draft: state.currentDraft,
            reasoning: state.generatorReasoning,
        });
        const systemPrompt = 'You are a senior copyeditor who critiques posts for maximum audience engagement.';
        const reflectResult = await (0, openai_1.callChatCompletion)(systemPrompt, prompt, true);
        const duration = Date.now() - startTime;
        return {
            selfReflection: {
                strengths: reflectResult.data.strengths || [],
                weaknesses: reflectResult.data.weaknesses || [],
                suggestions: reflectResult.data.suggestions || [],
                rewrittenDraft: reflectResult.data.rewrittenDraft,
            },
            totalTokens: {
                prompt: (state.totalTokens?.prompt || 0) + reflectResult.usage.promptTokens,
                completion: (state.totalTokens?.completion || 0) + reflectResult.usage.completionTokens,
            },
            totalCost: (state.totalCost || 0) + reflectResult.cost,
            latencyMs: (state.latencyMs || 0) + duration,
            status: 'reflecting',
        };
    };
    const criticNode = async (state) => {
        console.log(`[Job ${state.jobId}] Running critic node.`);
        const startTime = Date.now();
        const criticResult = await runAllCritics(state.selfReflection.rewrittenDraft, {
            topic: state.topic,
            audience: state.audience,
            tone: state.tone,
            minScore: minScoreConfig,
        });
        const duration = Date.now() - startTime;
        const updatedState = {
            critic: {
                score: criticResult.score,
                passed: criticResult.passed,
                feedback: criticResult.feedback,
                improvements: criticResult.improvements,
            },
            currentDraft: state.selfReflection.rewrittenDraft,
            totalTokens: {
                prompt: (state.totalTokens?.prompt || 0) + (criticResult.usage?.promptTokens || 0),
                completion: (state.totalTokens?.completion || 0) + (criticResult.usage?.completionTokens || 0),
            },
            totalCost: (state.totalCost || 0) + (criticResult.cost || 0),
            latencyMs: (state.latencyMs || 0) + duration,
            status: 'critiquing',
        };
        if (onStepUpdate) {
            onStepUpdate('critiquing', {
                ...state,
                ...updatedState,
            });
        }
        return updatedState;
    };
    const decisionRouter = (state) => {
        const isPassed = state.critic.passed;
        const isMaxIterations = state.currentIteration >= state.maxIterations;
        console.log(`[Job ${state.jobId}] Decision Router. Score: ${state.critic.score}. Passed: ${isPassed}. Iteration: ${state.currentIteration}/${state.maxIterations}`);
        if (isPassed || isMaxIterations) {
            console.log(`[Job ${state.jobId}] Terminating loop. End node.`);
            return 'end';
        }
        console.log(`[Job ${state.jobId}] Re-routing to Generator. Appending iteration history.`);
        return 'loop';
    };
    const loopNode = (state) => {
        const historyItem = {
            iteration: state.currentIteration,
            draft: state.currentDraft,
            reflection: state.selfReflection.suggestions.join(', '),
            criticFeedback: state.critic.feedback.join(', '),
        };
        return {
            history: [...(state.history || []), historyItem],
            currentIteration: state.currentIteration + 1,
        };
    };
    const builder = new langgraph_1.StateGraph(exports.WorkflowStateAnnotation)
        .addNode('generator', generatorNode)
        .addNode('reflection', reflectionNode)
        .addNode('criticNode', criticNode)
        .addNode('loop', loopNode)
        .addEdge(langgraph_1.START, 'generator')
        .addEdge('generator', 'reflection')
        .addEdge('reflection', 'criticNode');
    builder.addConditionalEdges('criticNode', decisionRouter, {
        end: langgraph_1.END,
        loop: 'loop',
    });
    builder.addEdge('loop', 'generator');
    return builder.compile();
}
//# sourceMappingURL=workflow.js.map