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
exports.callChatCompletion = callChatCompletion;
const openai_1 = __importDefault(require("openai"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7');
const openai = new openai_1.default({ apiKey });
const inputTokenCost = 0.15 / 1_000_000;
const outputTokenCost = 0.60 / 1_000_000;
async function callChatCompletion(systemPrompt, userPrompt, jsonMode = true) {
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
            let parsedData = contentText;
            if (jsonMode) {
                try {
                    parsedData = JSON.parse(contentText);
                }
                catch (err) {
                    console.error('Failed to parse response as JSON. Content:', contentText);
                    throw new Error('Invalid JSON format from LLM');
                }
            }
            const promptTokens = response.usage?.prompt_tokens || 0;
            const completionTokens = response.usage?.completion_tokens || 0;
            const totalTokens = response.usage?.total_tokens || 0;
            const cost = (promptTokens * inputTokenCost) + (completionTokens * outputTokenCost);
            return {
                data: parsedData,
                usage: {
                    promptTokens,
                    completionTokens,
                    totalTokens,
                },
                cost,
                latencyMs,
            };
        }
        catch (error) {
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
//# sourceMappingURL=openai.js.map