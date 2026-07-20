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
var SelfReflectionAgent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfReflectionAgent = void 0;
const common_1 = require("@nestjs/common");
const prompts_1 = require("../prompts");
const openai_service_1 = require("../services/openai.service");
let SelfReflectionAgent = SelfReflectionAgent_1 = class SelfReflectionAgent {
    openaiService;
    logger = new common_1.Logger(SelfReflectionAgent_1.name);
    constructor(openaiService) {
        this.openaiService = openaiService;
    }
    async run(draft, reasoning) {
        this.logger.log('Running Self Reflection Agent...');
        const prompt = (0, prompts_1.renderPrompt)(prompts_1.defaultTemplates.reflection, {
            draft,
            reasoning,
        });
        const systemPrompt = "You are a senior copyeditor who critiques posts for maximum audience engagement.";
        const result = await this.openaiService.callChatCompletion(systemPrompt, prompt, true);
        this.logger.log(`Self Reflection Agent completed. Latency: ${result.latencyMs}ms. Cost: $${result.cost}`);
        return {
            strengths: result.data.strengths || [],
            weaknesses: result.data.weaknesses || [],
            suggestions: result.data.suggestions || [],
            rewrittenDraft: result.data.rewrittenDraft,
            usage: result.usage,
            cost: result.cost,
            latencyMs: result.latencyMs,
        };
    }
};
exports.SelfReflectionAgent = SelfReflectionAgent;
exports.SelfReflectionAgent = SelfReflectionAgent = SelfReflectionAgent_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [openai_service_1.OpenaiService])
], SelfReflectionAgent);
//# sourceMappingURL=self-reflection.agent.js.map