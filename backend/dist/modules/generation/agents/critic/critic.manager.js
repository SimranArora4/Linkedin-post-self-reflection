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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CriticManager_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriticManager = void 0;
const common_1 = require("@nestjs/common");
const critic_interface_1 = require("./critic.interface");
let CriticManager = CriticManager_1 = class CriticManager {
    critics;
    logger = new common_1.Logger(CriticManager_1.name);
    constructor(critics) {
        this.critics = critics;
        this.logger.log(`Initialized CriticManager with ${this.critics.length} critics registered.`);
    }
    async runAll(draft, context) {
        this.logger.log(`Running evaluation across ${this.critics.length} critic(s)...`);
        if (this.critics.length === 0) {
            this.logger.warn('No critics registered. Automatically passing draft.');
            return { score: 10, passed: true, feedback: [], improvements: [], cost: 0, latencyMs: 0 };
        }
        const startTime = Date.now();
        const evaluations = await Promise.all(this.critics.map(async (critic) => {
            try {
                return await critic.evaluate(draft, context);
            }
            catch (error) {
                this.logger.error(`Critic [${critic.name}] failed to evaluate:`, error.stack);
                return {
                    score: 0,
                    passed: false,
                    feedback: [`Critic [${critic.name}] failed: ${error.message}`],
                    improvements: ['Fix system issues.'],
                    cost: 0,
                    latencyMs: 0,
                };
            }
        }));
        const totalDuration = Date.now() - startTime;
        let totalScore = 0;
        let overallPassed = true;
        const combinedFeedback = [];
        const combinedImprovements = [];
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;
        let totalCost = 0;
        for (let i = 0; i < evaluations.length; i++) {
            const result = evaluations[i];
            const critic = this.critics[i];
            totalScore += result.score;
            if (!result.passed) {
                overallPassed = false;
            }
            const prefix = `[${critic.name}]`;
            combinedFeedback.push(...result.feedback.map((f) => `${prefix} ${f}`));
            combinedImprovements.push(...result.improvements.map((imp) => `${prefix} ${imp}`));
            if (result.usage) {
                totalPromptTokens += result.usage.promptTokens;
                totalCompletionTokens += result.usage.completionTokens;
            }
            totalCost += result.cost || 0;
        }
        const averageScore = Number((totalScore / this.critics.length).toFixed(2));
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
};
exports.CriticManager = CriticManager;
exports.CriticManager = CriticManager = CriticManager_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(critic_interface_1.CRITIC_TOKEN)),
    __metadata("design:paramtypes", [Array])
], CriticManager);
//# sourceMappingURL=critic.manager.js.map