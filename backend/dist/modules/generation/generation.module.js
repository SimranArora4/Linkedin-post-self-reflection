"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerationModule = void 0;
const common_1 = require("@nestjs/common");
const openai_service_1 = require("./services/openai.service");
const generator_agent_1 = require("./agents/generator.agent");
const self_reflection_agent_1 = require("./agents/self-reflection.agent");
const critic_interface_1 = require("./agents/critic/critic.interface");
const general_critic_strategy_1 = require("./agents/critic/general-critic.strategy");
const critic_manager_1 = require("./agents/critic/critic.manager");
const generation_workflow_1 = require("./workflows/generation.workflow");
const generation_service_1 = require("./services/generation.service");
const generation_controller_1 = require("./controllers/generation.controller");
let GenerationModule = class GenerationModule {
};
exports.GenerationModule = GenerationModule;
exports.GenerationModule = GenerationModule = __decorate([
    (0, common_1.Module)({
        imports: [],
        controllers: [generation_controller_1.GenerationController],
        providers: [
            openai_service_1.OpenaiService,
            generator_agent_1.GeneratorAgent,
            self_reflection_agent_1.SelfReflectionAgent,
            general_critic_strategy_1.GeneralCritic,
            {
                provide: critic_interface_1.CRITIC_TOKEN,
                useFactory: (general) => [general],
                inject: [general_critic_strategy_1.GeneralCritic],
            },
            critic_manager_1.CriticManager,
            generation_workflow_1.GenerationWorkflow,
            generation_service_1.GenerationService,
        ],
        exports: [generation_service_1.GenerationService],
    })
], GenerationModule);
//# sourceMappingURL=generation.module.js.map