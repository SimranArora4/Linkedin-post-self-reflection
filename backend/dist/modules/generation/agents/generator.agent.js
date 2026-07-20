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
var GeneratorAgent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneratorAgent = void 0;
const common_1 = require("@nestjs/common");
const prompts_1 = require("../prompts");
const openai_service_1 = require("../services/openai.service");
let GeneratorAgent = GeneratorAgent_1 = class GeneratorAgent {
    openaiService;
    logger = new common_1.Logger(GeneratorAgent_1.name);
    constructor(openaiService) {
        this.openaiService = openaiService;
    }
    async run(topic, audience, tone, length, history) {
        this.logger.log(`Running Generator Agent for topic: "${topic}"`);
        const prompt = (0, prompts_1.renderPrompt)(prompts_1.defaultTemplates.generator, {
            topic,
            audience,
            tone,
            length,
            history: history || '',
        });
        const systemPrompt = "You are a helpful content creator specializing in social media growth.";
        const result = await this.openaiService.callChatCompletion(systemPrompt, prompt, true);
        this.logger.log(`Generator Agent completed. Latency: ${result.latencyMs}ms. Cost: $${result.cost}`);
        return {
            draft: result.data.draft,
            reasoning: result.data.reasoning,
            usage: result.usage,
            cost: result.cost,
            latencyMs: result.latencyMs,
        };
    }
};
exports.GeneratorAgent = GeneratorAgent;
exports.GeneratorAgent = GeneratorAgent = GeneratorAgent_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [openai_service_1.OpenaiService])
], GeneratorAgent);
//# sourceMappingURL=generator.agent.js.map