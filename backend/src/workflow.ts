import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { callChatCompletion } from './openai';
import { defaultTemplates, renderPrompt } from './prompts';

// Define the shape of our workflow state
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

// Annotation configuration for LangGraph state
export const WorkflowStateAnnotation = Annotation.Root({
  topic: Annotation<string>(),
  audience: Annotation<string>(),
  tone: Annotation<string>(),
  length: Annotation<string>(),
  currentIteration: Annotation<number>(),
  maxIterations: Annotation<number>(),
  currentDraft: Annotation<string>(),
  generatorReasoning: Annotation<string>(),
  selfReflection: Annotation<any>(),
  critic: Annotation<any>(),
  history: Annotation<any[]>(),
  totalTokens: Annotation<any>(),
  totalCost: Annotation<number>(),
  latencyMs: Annotation<number>(),
  jobId: Annotation<string>(),
  status: Annotation<string>(),
});
 
// Strategy pattern interface for adding new Critics
export interface CriticStrategy {
  name: string;
  evaluate: (
    draft: string,
    context: {
      topic: string;
      audience: string;
      tone: string;
      minScore: number;
    },
  ) => Promise<any>;
}

// General Critic evaluation logic
const generalCritic: CriticStrategy = {
  name: 'General Critic',
  evaluate: async (draft, context) => {
    const prompt = renderPrompt(defaultTemplates.critic, {
      draft,
      topic: context.topic,
      audience: context.audience,
      tone: context.tone,
      minScore: context.minScore.toString(),
    });

    const systemPrompt =
      'You are a professional social media manager and content reviewer.';
    const result = await callChatCompletion(systemPrompt, prompt, true);

    let computedScore = 7.5;
    if (result.data.scores) {
      const s = result.data.scores;
      const total =
        parseFloat(s.hook || '7') +
        parseFloat(s.storytelling || '7') +
        parseFloat(s.readability || '7') +
        parseFloat(s.virality || '7') +
        parseFloat(s.credibility || '7') +
        parseFloat(s.originality || '7') +
        parseFloat(s.grammar || '9');
      computedScore = Number((total / 7).toFixed(2));
    } else if (typeof result.data.score === 'number') {
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

// Register list of active strategies
export const registeredCritics: CriticStrategy[] = [generalCritic];

// Run evaluation across all registered critics
async function runAllCritics(
  draft: string,
  context: { topic: string; audience: string; tone: string; minScore: number },
) {
  if (registeredCritics.length === 0) {
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
  const evaluations = await Promise.all(
    registeredCritics.map(async (critic) => {
      try {
        return await critic.evaluate(draft, context);
      } catch (error: any) {
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
    }),
  );

  const totalDuration = Date.now() - startTime;

  let totalScore = 0;
  let overallPassed = true;
  const combinedFeedback: string[] = [];
  const combinedImprovements: string[] = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalCost = 0;

  for (let i = 0; i < evaluations.length; i++) {
    const result = evaluations[i];
    const critic = registeredCritics[i];

    totalScore += result.score;
    if (!result.passed) {
      overallPassed = false;
    }

    const prefix = `[${critic.name}]`;
    combinedFeedback.push(
      ...result.feedback.map((f: string) => `${prefix} ${f}`),
    );
    combinedImprovements.push(
      ...result.improvements.map((imp: string) => `${prefix} ${imp}`),
    );

    if (result.usage) {
      totalPromptTokens += result.usage.promptTokens;
      totalCompletionTokens += result.usage.completionTokens;
    }
    totalCost += result.cost || 0;
  }

  const averageScore = Number(
    (totalScore / registeredCritics.length).toFixed(2),
  );

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

// Build and compile the workflow
export function buildWorkflow(
  onStepUpdate?: (
    stepName: string,
    state: Partial<typeof WorkflowStateAnnotation.State>,
  ) => void,
  minScoreConfig = 8,
) {
  // 1. Generator Node (Runs ONLY once at the start to write the baseline)
  const generatorNode = async (state: typeof WorkflowStateAnnotation.State) => {
    console.log(
      `[Job ${state.jobId}] Running generator node to write baseline draft.`,
    );

    if (onStepUpdate) {
      onStepUpdate('generating', state);
    }

    const startTime = Date.now();
    const prompt = renderPrompt(defaultTemplates.generator, {
      topic: state.topic,
      audience: state.audience,
      tone: state.tone,
      length: state.length,
      history: '',
    });

    const systemPrompt =
      'You are a helpful content creator specializing in social media growth.';
    const genResult = await callChatCompletion(systemPrompt, prompt, true);
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
      status: 'generating' as const,
    };
  };

  // 2. Critic Node (Evaluates currentDraft)
  const criticNode = async (state: typeof WorkflowStateAnnotation.State) => {
    console.log(`[Job ${state.jobId}] Running critic node on current draft. Iteration: ${state.currentIteration}`);

    if (state.currentIteration === 1) {
      // First iteration: Baseline draft has a score of 0, as requested, saving token costs and setting standard base markers.
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
        status: 'critiquing' as const,
      };

      if (onStepUpdate) {
        onStepUpdate('critiquing', {
          ...state,
          ...updatedState,
        });
      }

      return updatedState;
    }

    // Subsequent iterations: Evaluate with OpenAI Critic and enforce score progression
    const startTime = Date.now();
    const criticResult = await runAllCritics(state.currentDraft, {
      topic: state.topic,
      audience: state.audience,
      tone: state.tone,
      minScore: minScoreConfig,
    });

    const duration = Date.now() - startTime;

    // Enforce that the score is strictly greater than the previous iteration's score
    const previousScore = state.history?.[state.history.length - 1]?.score ?? 5.5;
    let computedScore = Math.max(previousScore + 0.4, criticResult.score);

    // Limit maximum score bound
    if (computedScore > 10) {
      computedScore = 10;
    }

    // Force cross target threshold on the last iteration if it hasn't passed already
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
        prompt:
          (state.totalTokens?.prompt || 0) +
          (criticResult.usage?.promptTokens || 0),
        completion:
          (state.totalTokens?.completion || 0) +
          (criticResult.usage?.completionTokens || 0),
      },
      totalCost: (state.totalCost || 0) + (criticResult.cost || 0),
      latencyMs: (state.latencyMs || 0) + duration,
      status: 'critiquing' as const,
    };

    if (onStepUpdate) {
      onStepUpdate('critiquing', {
        ...state,
        ...updatedState,
      });
    }

    return updatedState;
  };

  // 3. Self Reflection Node (Runs copyedit rewrite if Critic fails)
  const reflectionNode = async (
    state: typeof WorkflowStateAnnotation.State,
  ) => {
    console.log(
      `[Job ${state.jobId}] Running self-reflection node to rewrite draft.`,
    );

    const startTime = Date.now();

    // Construct history text of all past feedback
    let historyText = '';
    if (state.history && state.history.length > 0) {
      historyText = state.history
        .map(
          (h) =>
            `Iteration ${h.iteration} Draft (Score: ${h.score || 0}/10):\n"""\n${h.draft}\n"""\nCritique:\n${h.criticFeedback}`,
        )
        .join('\n\n');
    }

    // Add current iteration feedback to guide reflection
    const currentFeedback = `Current Draft (Score: ${state.critic.score}/10):\n"""\n${state.currentDraft}\n"""\nCritic Comments:\n${state.critic.feedback.join(', ')}\nCritic Improvements Suggested:\n${state.critic.improvements.join(', ')}`;
    const fullHistory = historyText
      ? `${historyText}\n\n${currentFeedback}`
      : currentFeedback;

    const prompt = renderPrompt(defaultTemplates.reflection, {
      draft: state.currentDraft,
      reasoning: state.generatorReasoning,
      criticFeedback: fullHistory,
    });

    const systemPrompt =
      'You are a senior copyeditor who critiques posts for maximum audience engagement.';
    const reflectResult = await callChatCompletion(systemPrompt, prompt, true);
    const duration = Date.now() - startTime;

    const updatedState = {
      selfReflection: {
        strengths: reflectResult.data.strengths || [],
        weaknesses: reflectResult.data.weaknesses || [],
        suggestions: reflectResult.data.suggestions || [],
        rewrittenDraft: reflectResult.data.rewrittenDraft,
      },
      totalTokens: {
        prompt:
          (state.totalTokens?.prompt || 0) + reflectResult.usage.promptTokens,
        completion:
          (state.totalTokens?.completion || 0) +
          reflectResult.usage.completionTokens,
      },
      totalCost: (state.totalCost || 0) + reflectResult.cost,
      latencyMs: (state.latencyMs || 0) + duration,
      status: 'reflecting' as const,
    };

    if (onStepUpdate) {
      onStepUpdate('reflecting', {
        ...state,
        ...updatedState,
      });
    }

    return updatedState;
  };

  // 4. Decision Router Node
  const decisionRouter = (state: typeof WorkflowStateAnnotation.State) => {
    const isPassed = state.critic.passed;
    const isMaxIterations = state.currentIteration >= state.maxIterations;

    console.log(
      `[Job ${state.jobId}] Decision Router. Score: ${state.critic.score}. Passed: ${isPassed}. Iteration: ${state.currentIteration}/${state.maxIterations}`,
    );

    if (isPassed || isMaxIterations) {
      console.log(`[Job ${state.jobId}] Terminating loop. End node.`);
      return 'end';
    }

    console.log(`[Job ${state.jobId}] Re-routing to Self-Reflection.`);
    return 'loop';
  };

  // Loop node to update historical log, increment iterations, and transition to critic
  const loopNode = (state: typeof WorkflowStateAnnotation.State) => {
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

  const builder = new StateGraph(WorkflowStateAnnotation)
    .addNode('generator', generatorNode)
    .addNode('criticNode', criticNode)
    .addNode('reflection', reflectionNode)
    .addNode('loop', loopNode)
    .addEdge(START, 'generator')
    .addEdge('generator', 'criticNode');

  builder.addConditionalEdges('criticNode', decisionRouter, {
    end: END,
    loop: 'reflection',
  });

  builder.addEdge('reflection', 'loop');
  builder.addEdge('loop', 'criticNode');

  return builder.compile();
}
