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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OpenaiService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenaiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importDefault(require("openai"));
let OpenaiService = OpenaiService_1 = class OpenaiService {
    configService;
    logger = new common_1.Logger(OpenaiService_1.name);
    openai;
    model;
    temperature;
    inputTokenCost = 0.15 / 1_000_000;
    outputTokenCost = 0.60 / 1_000_000;
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('OPENAI_API_KEY');
        this.openai = new openai_1.default({ apiKey });
        this.model = this.configService.get('OPENAI_MODEL') || 'gpt-4o-mini';
        this.temperature = this.configService.get('OPENAI_TEMPERATURE') || 0.7;
    }
    async callChatCompletion(systemPrompt, userPrompt, jsonMode = true) {
        const startTime = Date.now();
        const maxRetries = 3;
        let attempt = 0;
        let delay = 1000;
        while (attempt < maxRetries) {
            try {
                const response = await this.openai.chat.completions.create({
                    model: this.model,
                    temperature: this.temperature,
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
                        this.logger.error('Failed to parse response as JSON. Content:', contentText);
                        throw new Error('Invalid JSON format from LLM');
                    }
                }
                const promptTokens = response.usage?.prompt_tokens || 0;
                const completionTokens = response.usage?.completion_tokens || 0;
                const totalTokens = response.usage?.total_tokens || 0;
                const cost = (promptTokens * this.inputTokenCost) + (completionTokens * this.outputTokenCost);
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
                this.logger.warn(`OpenAI API call failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
                if (attempt >= maxRetries) {
                    this.logger.error('Max retries reached. OpenAI call failed.', error.stack);
                    throw error;
                }
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
        throw new Error('Failed to fetch completion from OpenAI');
    }
};
exports.OpenaiService = OpenaiService;
exports.OpenaiService = OpenaiService = OpenaiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _a : Object])
], OpenaiService);
//# sourceMappingURL=openai.service.js.map