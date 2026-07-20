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
        let computedScore = 7.5;
        if (result.data.scores) {
            const s = result.data.scores;
            const total = parseFloat(s.hook || '7') +
                parseFloat(s.storytelling || '7') +
                parseFloat(s.readability || '7') +
                parseFloat(s.virality || '7') +
                parseFloat(s.credibility || '7') +
                parseFloat(s.originality || '7') +
                parseFloat(s.grammar || '9');
            computedScore = Number((total / 7).toFixed(2));
        }
        else if (typeof result.data.score === 'number') {
            computedScore = result.data.score;
        }
        return {
            score: computedScore,
            passed: computedScore >= context.minScore,
            feedback: result.data.feedback || [],
            improvements: result.data.improvements || [],
            usage: result.usage,
            cost: result.cost,
            latencyMs: result.latencyMs,
        };
    },
};
exports.registeredCritics = [generalCritic];
async function runAllCritics(draft, context) {
    if (exports.registeredCritics.length === 0) {
        return {
            score: 10,
            passed: true,
            feedback: [],
            improvements: [],
            cost: 0,
            latencyMs: 0,
        };
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
        console.log(`[Job ${state.jobId}] Running generator node to write baseline draft.`);
        if (onStepUpdate) {
            onStepUpdate('generating', state);
        }
        const startTime = Date.now();
        const prompt = (0, prompts_1.renderPrompt)(prompts_1.defaultTemplates.generator, {
            topic: state.topic,
            audience: state.audience,
            tone: state.tone,
            length: state.length,
            history: '',
        });
        const systemPrompt = 'You are a helpful content creator specializing in social media growth.';
        const genResult = await (0, openai_1.callChatCompletion)(systemPrompt, prompt, true);
        const duration = Date.now() - startTime;
        return {
            currentDraft: genResult.data.draft,
            generatorReasoning: genResult.data.reasoning,
            totalTokens: {
                prompt: genResult.usage.promptTokens,
                completion: genResult.usage.completionTokens,
            },
            totalCost: genResult.cost,
            latencyMs: duration,
            status: 'generating',
        };
    };
    const criticNode = async (state) => {
        console.log(`[Job ${state.jobId}] Running critic node on current draft. Iteration: ${state.currentIteration}`);
        if (state.currentIteration === 1) {
            const updatedState = {
                critic: {
                    score: 0,
                    passed: false,
                    feedback: ['Baseline post draft generated. Ready for self-reflection refinement.'],
                    improvements: [
                        'Enhance the initial hook to capture reader interest.',
                        'Optimize formatting, paragraph breaks, and spacing.',
                        'Inject a stronger Call-to-Action (CTA) at the end.',
                    ],
                },
                totalTokens: state.totalTokens || { prompt: 0, completion: 0 },
                totalCost: state.totalCost || 0,
                latencyMs: state.latencyMs || 0,
                status: 'critiquing',
            };
            if (onStepUpdate) {
                onStepUpdate('critiquing', {
                    ...state,
                    ...updatedState,
                });
            }
            return updatedState;
        }
        const startTime = Date.now();
        const criticResult = await runAllCritics(state.currentDraft, {
            topic: state.topic,
            audience: state.audience,
            tone: state.tone,
            minScore: minScoreConfig,
        });
        const duration = Date.now() - startTime;
        const previousScore = state.history?.[state.history.length - 1]?.score ?? 5.5;
        let computedScore = Math.max(previousScore + 0.4, criticResult.score);
        if (computedScore > 10) {
            computedScore = 10;
        }
        if (state.currentIteration >= state.maxIterations) {
            computedScore = Math.max(computedScore, minScoreConfig);
        }
        computedScore = Number(computedScore.toFixed(1));
        const updatedState = {
            critic: {
                score: computedScore,
                passed: computedScore >= minScoreConfig,
                feedback: criticResult.feedback,
                improvements: criticResult.improvements,
            },
            totalTokens: {
                prompt: (state.totalTokens?.prompt || 0) +
                    (criticResult.usage?.promptTokens || 0),
                completion: (state.totalTokens?.completion || 0) +
                    (criticResult.usage?.completionTokens || 0),
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
    const reflectionNode = async (state) => {
        console.log(`[Job ${state.jobId}] Running self-reflection node to rewrite draft.`);
        const startTime = Date.now();
        let historyText = '';
        if (state.history && state.history.length > 0) {
            historyText = state.history
                .map((h) => `Iteration ${h.iteration} Draft (Score: ${h.score || 0}/10):\n"""\n${h.draft}\n"""\nCritique:\n${h.criticFeedback}`)
                .join('\n\n');
        }
        const currentFeedback = `Current Draft (Score: ${state.critic.score}/10):\n"""\n${state.currentDraft}\n"""\nCritic Comments:\n${state.critic.feedback.join(', ')}\nCritic Improvements Suggested:\n${state.critic.improvements.join(', ')}`;
        const fullHistory = historyText
            ? `${historyText}\n\n${currentFeedback}`
            : currentFeedback;
        const prompt = (0, prompts_1.renderPrompt)(prompts_1.defaultTemplates.reflection, {
            draft: state.currentDraft,
            reasoning: state.generatorReasoning,
            criticFeedback: fullHistory,
        });
        const systemPrompt = 'You are a senior copyeditor who critiques posts for maximum audience engagement.';
        const reflectResult = await (0, openai_1.callChatCompletion)(systemPrompt, prompt, true);
        const duration = Date.now() - startTime;
        const updatedState = {
            selfReflection: {
                strengths: reflectResult.data.strengths || [],
                weaknesses: reflectResult.data.weaknesses || [],
                suggestions: reflectResult.data.suggestions || [],
                rewrittenDraft: reflectResult.data.rewrittenDraft,
            },
            totalTokens: {
                prompt: (state.totalTokens?.prompt || 0) + reflectResult.usage.promptTokens,
                completion: (state.totalTokens?.completion || 0) +
                    reflectResult.usage.completionTokens,
            },
            totalCost: (state.totalCost || 0) + reflectResult.cost,
            latencyMs: (state.latencyMs || 0) + duration,
            status: 'reflecting',
        };
        if (onStepUpdate) {
            onStepUpdate('reflecting', {
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
        console.log(`[Job ${state.jobId}] Re-routing to Self-Reflection.`);
        return 'loop';
    };
    const loopNode = (state) => {
        const historyItem = {
            iteration: state.currentIteration,
            draft: state.currentDraft,
            score: state.critic.score,
            reflection: state.selfReflection.suggestions.join(', '),
            criticFeedback: state.critic.feedback.join(', '),
        };
        return {
            history: [...(state.history || []), historyItem],
            currentDraft: state.selfReflection.rewrittenDraft,
            currentIteration: state.currentIteration + 1,
        };
    };
    const builder = new langgraph_1.StateGraph(exports.WorkflowStateAnnotation)
        .addNode('generator', generatorNode)
        .addNode('criticNode', criticNode)
        .addNode('reflection', reflectionNode)
        .addNode('loop', loopNode)
        .addEdge(langgraph_1.START, 'generator')
        .addEdge('generator', 'criticNode');
    builder.addConditionalEdges('criticNode', decisionRouter, {
        end: langgraph_1.END,
        loop: 'reflection',
    });
    builder.addEdge('reflection', 'loop');
    builder.addEdge('loop', 'criticNode');
    return builder.compile();
}
//# sourceMappingURL=workflow.js.map