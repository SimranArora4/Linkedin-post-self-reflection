import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { buildWorkflow, WorkflowState } from './workflow';

dotenv.config({ path: ['../.env', '.env'] });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.PORT || '8080');
const defaultMaxIterations = parseInt(process.env.MAX_ITERATIONS || '10');
const minScoreConfig = parseFloat(process.env.MIN_SCORE || '8');

// In-Memory Database Map storing jobs
interface JobRecord {
  id: string;
  topic: string;
  audience: string;
  tone: string;
  length: string;
  status: string;
  iterations: any[];
  totalTokens: { prompt: number; completion: number };
  totalCost: number;
  latencyMs: number;
  createdAt: Date;
  finalDraft?: string;
  error?: string;
}

const jobs = new Map<string, JobRecord>();

// Socket.io connection listener
io.on('connection', (socket) => {
  console.log(`📡 WebSocket Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`🔌 WebSocket Client disconnected: ${socket.id}`);
  });
});

// Helper function to emit progress events
function emitProgress(jobId: string, payload: any) {
  io.emit(`job:${jobId}:progress`, payload);
}

// Background workflow execution
async function runWorkflowBackground(jobId: string, body: any) {
  console.log(`[Job ${jobId}] Starting background process runner...`);
  
  const job = jobs.get(jobId);
  if (job) {
    job.status = 'PROCESSING';
  }

  const onStepUpdate = async (stepName: string, state: any) => {
    console.log(`[Job ${jobId}] Step transition: ${stepName}`);

    // Emit Socket progress event
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
    const workflow = buildWorkflow(onStepUpdate, minScoreConfig);

    const initialState: WorkflowState = {
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
  } catch (error: any) {
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

// REST Route handlers
app.post('/generate', async (req, res) => {
  const { topic, audience, tone, length } = req.body;
  const sync = req.query.sync === 'true';

  if (!topic) {
    return res.status(400).json({ message: 'Validation failed', error: 'topic is required' });
  }

  const jobId = 'job_' + Math.random().toString(36).substring(2, 11);
  console.log(`🚀 HTTP request received for topic: "${topic}". Job ID: ${jobId}`);

  // Create record
  const jobRecord: JobRecord = {
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
      const workflow = buildWorkflow(async (stepName, state) => {
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

      const initialState: WorkflowState = {
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
    } catch (err: any) {
      console.error('Synchronous workflow failed:', err);
      jobRecord.status = 'FAILED';
      jobRecord.error = err.message;
      return res.status(500).json({ error: err.message });
    }
  }

  // Asynchronous default run
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

// Boot the server
httpServer.listen(PORT, () => {
  console.log(`🚀 LinkedIn Post Agent Backend running on: http://localhost:${PORT}`);
});
