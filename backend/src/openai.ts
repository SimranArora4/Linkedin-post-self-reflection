import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config({ path: ['../.env', '.env'] });

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7');

const openai = new OpenAI({ apiKey });

// Cost tracking definitions for gpt-4o-mini
const inputTokenCost = 0.15 / 1_000_000;
const outputTokenCost = 0.60 / 1_000_000;

export interface ChatCompletionResult<T> {
  data: T;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  latencyMs: number;
}

export async function callChatCompletion<T = any>(
  systemPrompt: string,
  userPrompt: string,
  jsonMode = true,
): Promise<ChatCompletionResult<T>> {
  const startTime = Date.now();
  const maxRetries = 3;
  let attempt = 0;
  let delay = 1000;

  while (attempt < maxRetries) {
    try {
      const response = await openai.chat.completions.create({
        model,
        temperature,
        response_format: jsonMode ? { type: 'json_object' } : undefined,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const latencyMs = Date.now() - startTime;
      const choice = response.choices[0];
      const contentText = choice?.message?.content || '';

      let parsedData: any = contentText;
      if (jsonMode) {
        try {
          parsedData = JSON.parse(contentText);
        } catch (err: any) {
          console.error('Failed to parse response as JSON. Content:', contentText);
          throw new Error('Invalid JSON format from LLM');
        }
      }

      const promptTokens = response.usage?.prompt_tokens || 0;
      const completionTokens = response.usage?.completion_tokens || 0;
      const totalTokens = response.usage?.total_tokens || 0;

      const cost = (promptTokens * inputTokenCost) + (completionTokens * outputTokenCost);

      return {
        data: parsedData as T,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
        cost,
        latencyMs,
      };
    } catch (error: any) {
      attempt++;
      console.warn(`OpenAI API call failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
      
      if (attempt >= maxRetries) {
        console.error('Max retries reached. OpenAI call failed.', error.stack);
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw new Error('Failed to fetch completion from OpenAI');
}
