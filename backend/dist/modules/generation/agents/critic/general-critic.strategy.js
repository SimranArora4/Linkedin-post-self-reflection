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
var GeneralCritic_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneralCritic = void 0;
const common_1 = require("@nestjs/common");
const prompts_1 = require("../../prompts");
const openai_service_1 = require("../../services/openai.service");
let GeneralCritic = GeneralCritic_1 = class GeneralCritic {
    openaiService;
    name = 'General Critic';
    logger = new common_1.Logger(GeneralCritic_1.name);
    constructor(openaiService) {
        this.openaiService = openaiService;
    }
    async evaluate(draft, context) {
        this.logger.log('Evaluating draft with General Critic...');
        const prompt = (0, prompts_1.renderPrompt)(prompts_1.defaultTemplates.critic, {
            draft,
            topic: context.topic,
            audience: context.audience,
            tone: context.tone,
            minScore: context.minScore.toString(),
        });
        const systemPrompt = "You are a professional social media manager and content reviewer.";
        const result = await this.openaiService.callChatCompletion(systemPrompt, prompt, true);
        this.logger.log(`General Critic finished. Score: ${result.data.score}/${context.minScore}. Passed: ${result.data.passed}`);
        return {
            score: result.data.score,
            passed: result.data.passed,
            feedback: result.data.feedback || [],
            improvements: result.data.improvements || [],
            usage: result.usage,
            cost: result.cost,
            latencyMs: result.latencyMs,
        };
    }
};
exports.GeneralCritic = GeneralCritic;
exports.GeneralCritic = GeneralCritic = GeneralCritic_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [openai_service_1.OpenaiService])
], GeneralCritic);
//# sourceMappingURL=general-critic.strategy.js.map