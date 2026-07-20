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
var GenerationService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const generation_workflow_1 = require("../workflows/generation.workflow");
const socket_gateway_1 = require("../../socket/socket.gateway");
let GenerationService = GenerationService_1 = class GenerationService {
    generationWorkflow;
    configService;
    socketGateway;
    logger = new common_1.Logger(GenerationService_1.name);
    defaultMaxIterations;
    minScore;
    jobs = new Map();
    constructor(generationWorkflow, configService, socketGateway) {
        this.generationWorkflow = generationWorkflow;
        this.configService = configService;
        this.socketGateway = socketGateway;
        this.defaultMaxIterations = this.configService.get('MAX_ITERATIONS', 10);
        this.minScore = this.configService.get('MIN_SCORE', 9);
    }
    async createJob(dto) {
        const jobId = 'job_' + Math.random().toString(36).substring(2, 11);
        this.logger.log(`Starting in-process background post generation task for topic: "${dto.topic}". Assigned Job ID: ${jobId}`);
        const jobRecord = {
            id: jobId,
            topic: dto.topic,
            audience: dto.audience,
            tone: dto.tone,
            length: dto.length,
            status: 'PENDING',
            iterations: [],
            totalTokens: { prompt: 0, completion: 0 },
            totalCost: 0,
            latencyMs: 0,
            createdAt: new Date(),
        };
        this.jobs.set(jobId, jobRecord);
        this.runWorkflowBackground(jobId, dto).catch((err) => {
            this.logger.error(`Critical error running background workflow for Job ${jobId}`, err.stack);
        });
        return { jobId };
    }
    async runWorkflowBackground(jobId, dto) {
        this.logger.log(`[Job ${jobId}] Starting workflow runner...`);
        const job = this.jobs.get(jobId);
        if (job) {
            job.status = 'PROCESSING';
        }
        const onStepUpdate = async (stepName, state) => {
            this.logger.log(`[Job ${jobId}] Active Node: ${stepName}`);
            this.socketGateway.emitProgress(jobId, {
                status: stepName,
                iteration: state.currentIteration || 1,
                data: {
                    currentDraft: state.currentDraft,
                    score: state.critic?.score,
                    passed: state.critic?.passed,
                    feedback: state.critic?.feedback,
                    improvements: state.critic?.improvements,
                    strengths: state.selfReflection?.strengths,
                    weaknesses: state.selfReflection?.weaknesses,
                    suggestions: state.selfReflection?.suggestions,
                    minScore: this.minScore,
                },
            });
            if (stepName === 'critiquing' && state.critic) {
                this.logger.log(`[Job ${jobId}] Iteration ${state.currentIteration} complete. Storing in memory.`);
                const currentJob = this.jobs.get(jobId);
                if (currentJob) {
                    currentJob.iterations.push({
                        iterationNumber: state.currentIteration ?? 1,
                        draft: state.currentDraft ?? '',
                        reasoning: state.generatorReasoning,
                        selfReflection: {
                            strengths: state.selfReflection?.strengths || [],
                            weaknesses: state.selfReflection?.weaknesses || [],
                            suggestions: state.selfReflection?.suggestions || [],
                            rewrittenDraft: state.selfReflection?.rewrittenDraft || '',
                        },
                        critic: {
                            score: state.critic.score,
                            passed: state.critic.passed,
                            feedback: state.critic.feedback,
                            improvements: state.critic.improvements,
                        },
                        tokens: {
                            prompt: state.totalTokens?.prompt || 0,
                            completion: state.totalTokens?.completion || 0,
                        },
                        latencyMs: state.latencyMs || 0,
                        timestamp: new Date(),
                    });
                }
            }
        };
        try {
            const workflow = this.generationWorkflow.build(onStepUpdate);
            const initialState = {
                topic: dto.topic,
                audience: dto.audience,
                tone: dto.tone,
                length: dto.length,
                currentIteration: 1,
                maxIterations: this.defaultMaxIterations,
                currentDraft: '',
                generatorReasoning: '',
                selfReflection: {
                    strengths: [],
                    weaknesses: [],
                    suggestions: [],
                    rewrittenDraft: '',
                },
                critic: { score: 0, passed: false, feedback: [], improvements: [] },
                history: [],
                totalTokens: { prompt: 0, completion: 0 },
                totalCost: 0,
                latencyMs: 0,
                jobId: jobId,
                status: 'generating',
            };
            const resultState = await workflow.invoke(initialState, {
                recursionLimit: 100,
            });
            this.logger.log(`[Job ${jobId}] Workflow completed successfully.`);
            const currentJob = this.jobs.get(jobId);
            if (currentJob) {
                currentJob.status = 'COMPLETED';
                currentJob.finalDraft = resultState.currentDraft;
                currentJob.totalTokens = resultState.totalTokens;
                currentJob.totalCost = resultState.totalCost;
                currentJob.latencyMs = resultState.latencyMs;
            }
            this.socketGateway.emitProgress(jobId, {
                status: 'completed',
                iteration: resultState.currentIteration,
                data: {
                    finalDraft: resultState.currentDraft,
                    totalCost: resultState.totalCost,
                    latencyMs: resultState.latencyMs,
                    totalTokens: resultState.totalTokens,
                },
            });
        }
        catch (error) {
            this.logger.error(`[Job ${jobId}] Workflow failed:`, error.stack);
            const currentJob = this.jobs.get(jobId);
            if (currentJob) {
                currentJob.status = 'FAILED';
                currentJob.error = error.message;
            }
            this.socketGateway.emitProgress(jobId, {
                status: 'failed',
                iteration: 0,
                data: { error: error.message },
            });
        }
    }
    async getJobStatus(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            return null;
        }
        return {
            id: job.id,
            status: job.status,
            finalDraft: job.finalDraft,
            iterations: job.iterations,
            totalCost: job.totalCost,
            latencyMs: job.latencyMs,
            totalTokens: job.totalTokens,
            error: job.error,
        };
    }
    async generateSync(dto) {
        const jobId = 'job_sync_' + Math.random().toString(36).substring(2, 11);
        this.logger.log(`Running synchronous generation task: "${dto.topic}"`);
        const jobRecord = {
            id: jobId,
            topic: dto.topic,
            audience: dto.audience,
            tone: dto.tone,
            length: dto.length,
            status: 'PROCESSING',
            iterations: [],
            totalTokens: { prompt: 0, completion: 0 },
            totalCost: 0,
            latencyMs: 0,
            createdAt: new Date(),
        };
        this.jobs.set(jobId, jobRecord);
        try {
            const workflow = this.generationWorkflow.build(async (stepName, state) => {
                if (stepName === 'critiquing' && state.critic) {
                    jobRecord.iterations.push({
                        iterationNumber: state.currentIteration ?? 1,
                        draft: state.currentDraft ?? '',
                        reasoning: state.generatorReasoning,
                        selfReflection: {
                            strengths: state.selfReflection?.strengths || [],
                            weaknesses: state.selfReflection?.weaknesses || [],
                            suggestions: state.selfReflection?.suggestions || [],
                            rewrittenDraft: state.selfReflection?.rewrittenDraft || '',
                        },
                        critic: {
                            score: state.critic.score,
                            passed: state.critic.passed,
                            feedback: state.critic.feedback,
                            improvements: state.critic.improvements,
                        },
                        tokens: {
                            prompt: state.totalTokens?.prompt || 0,
                            completion: state.totalTokens?.completion || 0,
                        },
                        latencyMs: state.latencyMs || 0,
                        timestamp: new Date(),
                    });
                }
            });
            const initialState = {
                topic: dto.topic,
                audience: dto.audience,
                tone: dto.tone,
                length: dto.length,
                currentIteration: 1,
                maxIterations: this.defaultMaxIterations,
                currentDraft: '',
                generatorReasoning: '',
                selfReflection: {
                    strengths: [],
                    weaknesses: [],
                    suggestions: [],
                    rewrittenDraft: '',
                },
                critic: { score: 0, passed: false, feedback: [], improvements: [] },
                history: [],
                totalTokens: { prompt: 0, completion: 0 },
                totalCost: 0,
                latencyMs: 0,
                jobId: jobId,
                status: 'generating',
            };
            const resultState = await workflow.invoke(initialState, {
                recursionLimit: 100,
            });
            jobRecord.status = 'COMPLETED';
            jobRecord.finalDraft = resultState.currentDraft;
            jobRecord.totalTokens = resultState.totalTokens;
            jobRecord.totalCost = resultState.totalCost;
            jobRecord.latencyMs = resultState.latencyMs;
            return {
                finalDraft: resultState.currentDraft ?? '',
                iterations: jobRecord.iterations.length,
                scores: jobRecord.iterations.map((i) => i.critic?.score || 0),
                reflections: jobRecord.iterations.map((i) => ({
                    iteration: i.iterationNumber,
                    strengths: i.selfReflection?.strengths || [],
                    weaknesses: i.selfReflection?.weaknesses || [],
                    suggestions: i.selfReflection?.suggestions || [],
                })),
                totalCost: resultState.totalCost ?? 0,
                latency: `${resultState.latencyMs ?? 0}ms`,
            };
        }
        catch (error) {
            this.logger.error(`Synchronous generation failed for Job ${jobId}`, error.stack);
            jobRecord.status = 'FAILED';
            jobRecord.error = error.message;
            throw error;
        }
    }
};
exports.GenerationService = GenerationService;
exports.GenerationService = GenerationService = GenerationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [generation_workflow_1.GenerationWorkflow, typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object, socket_gateway_1.SocketGateway])
], GenerationService);
//# sourceMappingURL=generation.service.js.map