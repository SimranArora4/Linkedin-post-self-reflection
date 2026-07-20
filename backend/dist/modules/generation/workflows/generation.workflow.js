"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GenerationWorkflow_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerationWorkflow = exports.WorkflowStateAnnotation = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const langgraph_1 = require("@langchain/langgraph");
const generator_agent_1 = require("../agents/generator.agent");
const self_reflection_agent_1 = require("../agents/self-reflection.agent");
const critic_manager_1 = require("../agents/critic/critic.manager");
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
let GenerationWorkflow = GenerationWorkflow_1 = class GenerationWorkflow {
    generatorAgent;
    reflectionAgent;
    criticManager;
    configService;
    logger = new common_1.Logger(GenerationWorkflow_1.name);
    constructor(generatorAgent, reflectionAgent, criticManager, configService) {
        this.generatorAgent = generatorAgent;
        this.reflectionAgent = reflectionAgent;
        this.criticManager = criticManager;
        this.configService = configService;
    }
    build(onStepUpdate) {
        const generatorNode = async (state) => {
            this.logger.log(`[Job ${state.jobId}] Running generator node. Iteration: ${state.currentIteration}`);
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
            const genResult = await this.generatorAgent.run(state.topic, state.audience, state.tone, state.length, historyText);
            const duration = Date.now() - startTime;
            return {
                currentDraft: genResult.draft,
                generatorReasoning: genResult.reasoning,
                totalTokens: {
                    prompt: (state.totalTokens?.prompt || 0) + genResult.usage.promptTokens,
                    completion: (state.totalTokens?.completion || 0) +
                        genResult.usage.completionTokens,
                },
                totalCost: (state.totalCost || 0) + genResult.cost,
                latencyMs: (state.latencyMs || 0) + duration,
                status: 'generating',
            };
        };
        const reflectionNode = async (state) => {
            this.logger.log(`[Job ${state.jobId}] Running self-reflection node.`);
            if (onStepUpdate) {
                onStepUpdate('reflecting', state);
            }
            const startTime = Date.now();
            const reflectResult = await this.reflectionAgent.run(state.currentDraft, state.generatorReasoning);
            const duration = Date.now() - startTime;
            return {
                selfReflection: {
                    strengths: reflectResult.strengths,
                    weaknesses: reflectResult.weaknesses,
                    suggestions: reflectResult.suggestions,
                    rewrittenDraft: reflectResult.rewrittenDraft,
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
        };
        const criticNode = async (state) => {
            this.logger.log(`[Job ${state.jobId}] Running critic node.`);
            const startTime = Date.now();
            const minScore = this.configService.get('MIN_SCORE', 8);
            const criticResult = await this.criticManager.runAll(state.selfReflection.rewrittenDraft, {
                topic: state.topic,
                audience: state.audience,
                tone: state.tone,
                minScore,
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
        const decisionRouter = (state) => {
            const isPassed = state.critic.passed;
            const isMaxIterations = state.currentIteration >= state.maxIterations;
            this.logger.log(`[Job ${state.jobId}] Decision Router. Score: ${state.critic.score}. Passed: ${isPassed}. Iteration: ${state.currentIteration}/${state.maxIterations}`);
            if (isPassed || isMaxIterations) {
                this.logger.log(`[Job ${state.jobId}] Terminating loop. End node.`);
                return 'end';
            }
            this.logger.log(`[Job ${state.jobId}] Re-routing to Generator. Appending iteration history.`);
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
};
exports.GenerationWorkflow = GenerationWorkflow;
exports.GenerationWorkflow = GenerationWorkflow = GenerationWorkflow_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [generator_agent_1.GeneratorAgent,
        self_reflection_agent_1.SelfReflectionAgent,
        critic_manager_1.CriticManager, typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], GenerationWorkflow);
//# sourceMappingURL=generation.workflow.js.map