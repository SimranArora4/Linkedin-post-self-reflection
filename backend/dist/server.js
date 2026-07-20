"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv = __importStar(require("dotenv"));
const workflow_1 = require("./workflow");
dotenv.config({ path: ['../.env', '.env'] });
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const PORT = parseInt(process.env.PORT || '8080');
const defaultMaxIterations = parseInt(process.env.MAX_ITERATIONS || '10');
const minScoreConfig = parseFloat(process.env.MIN_SCORE || '8');
const jobs = new Map();
io.on('connection', (socket) => {
    console.log(`📡 WebSocket Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`🔌 WebSocket Client disconnected: ${socket.id}`);
    });
});
function emitProgress(jobId, payload) {
    io.emit(`job:${jobId}:progress`, payload);
}
async function runWorkflowBackground(jobId, body) {
    console.log(`[Job ${jobId}] Starting background process runner...`);
    const job = jobs.get(jobId);
    if (job) {
        job.status = 'PROCESSING';
    }
    const onStepUpdate = async (stepName, state) => {
        console.log(`[Job ${jobId}] Step transition: ${stepName}`);
        emitProgress(jobId, {
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
                minScore: minScoreConfig,
            },
        });
        if (stepName === 'critiquing' && state.critic) {
            const currentJob = jobs.get(jobId);
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
        const workflow = (0, workflow_1.buildWorkflow)(onStepUpdate, minScoreConfig);
        const initialState = {
            topic: body.topic,
            audience: body.audience,
            tone: body.tone,
            length: body.length,
            currentIteration: 1,
            maxIterations: defaultMaxIterations,
            currentDraft: '',
            generatorReasoning: '',
            selfReflection: { strengths: [], weaknesses: [], suggestions: [], rewrittenDraft: '' },
            critic: { score: 0, passed: false, feedback: [], improvements: [] },
            history: [],
            totalTokens: { prompt: 0, completion: 0 },
            totalCost: 0,
            latencyMs: 0,
            jobId: jobId,
            status: 'generating',
        };
        const resultState = await workflow.invoke(initialState, { recursionLimit: 100 });
        console.log(`[Job ${jobId}] Workflow completed successfully.`);
        const currentJob = jobs.get(jobId);
        if (currentJob) {
            currentJob.status = 'COMPLETED';
            currentJob.finalDraft = resultState.currentDraft;
            currentJob.totalTokens = resultState.totalTokens;
            currentJob.totalCost = resultState.totalCost;
            currentJob.latencyMs = resultState.latencyMs;
        }
        emitProgress(jobId, {
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
        console.error(`[Job ${jobId}] Workflow runner failed:`, error);
        const currentJob = jobs.get(jobId);
        if (currentJob) {
            currentJob.status = 'FAILED';
            currentJob.error = error.message;
        }
        emitProgress(jobId, {
            status: 'failed',
            iteration: 0,
            data: { error: error.message },
        });
    }
}
app.post('/generate', async (req, res) => {
    const { topic, audience, tone, length } = req.body;
    const sync = req.query.sync === 'true';
    if (!topic) {
        return res.status(400).json({ message: 'Validation failed', error: 'topic is required' });
    }
    const jobId = 'job_' + Math.random().toString(36).substring(2, 11);
    console.log(`🚀 HTTP request received for topic: "${topic}". Job ID: ${jobId}`);
    const jobRecord = {
        id: jobId,
        topic,
        audience: audience || 'General Audience',
        tone: tone || 'Professional',
        length: length || 'Medium',
        status: 'PENDING',
        iterations: [],
        totalTokens: { prompt: 0, completion: 0 },
        totalCost: 0,
        latencyMs: 0,
        createdAt: new Date(),
    };
    jobs.set(jobId, jobRecord);
    if (sync) {
        try {
            const workflow = (0, workflow_1.buildWorkflow)(async (stepName, state) => {
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
            }, minScoreConfig);
            const initialState = {
                topic,
                audience: audience || 'General Audience',
                tone: tone || 'Professional',
                length: length || 'Medium',
                currentIteration: 1,
                maxIterations: defaultMaxIterations,
                currentDraft: '',
                generatorReasoning: '',
                selfReflection: { strengths: [], weaknesses: [], suggestions: [], rewrittenDraft: '' },
                critic: { score: 0, passed: false, feedback: [], improvements: [] },
                history: [],
                totalTokens: { prompt: 0, completion: 0 },
                totalCost: 0,
                latencyMs: 0,
                jobId: jobId,
                status: 'generating',
            };
            const resultState = await workflow.invoke(initialState, { recursionLimit: 100 });
            jobRecord.status = 'COMPLETED';
            jobRecord.finalDraft = resultState.currentDraft;
            jobRecord.totalTokens = resultState.totalTokens;
            jobRecord.totalCost = resultState.totalCost;
            jobRecord.latencyMs = resultState.latencyMs;
            return res.json({
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
            });
        }
        catch (err) {
            console.error('Synchronous workflow failed:', err);
            jobRecord.status = 'FAILED';
            jobRecord.error = err.message;
            return res.status(500).json({ error: err.message });
        }
    }
    runWorkflowBackground(jobId, req.body).catch((err) => {
        console.error(`Background runner exception for Job ${jobId}:`, err);
    });
    return res.json({ jobId });
});
app.get('/generate/status/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) {
        return res.status(404).json({ message: `Job ${req.params.jobId} not found` });
    }
    return res.json({
        id: job.id,
        status: job.status,
        finalDraft: job.finalDraft,
        iterations: job.iterations,
        totalCost: job.totalCost,
        latencyMs: job.latencyMs,
        totalTokens: job.totalTokens,
        error: job.error,
    });
});
httpServer.listen(PORT, () => {
    console.log(`🚀 LinkedIn Post Agent Backend running on: http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map