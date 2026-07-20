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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerationController = void 0;
const common_1 = require("@nestjs/common");
const generation_service_1 = require("../services/generation.service");
const generate_post_dto_1 = require("../dto/generate-post.dto");
const zod_validation_pipe_1 = require("../../../common/pipes/zod-validation.pipe");
let GenerationController = class GenerationController {
    generationService;
    constructor(generationService) {
        this.generationService = generationService;
    }
    async generate(dto, sync) {
        if (sync === 'true') {
            return this.generationService.generateSync(dto);
        }
        return this.generationService.createJob(dto);
    }
    async getStatus(jobId) {
        const jobStatus = await this.generationService.getJobStatus(jobId);
        if (!jobStatus) {
            throw new common_1.NotFoundException(`Generation job with ID "${jobId}" not found`);
        }
        return jobStatus;
    }
};
exports.GenerationController = GenerationController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(generate_post_dto_1.GeneratePostSchema))),
    __param(1, (0, common_1.Query)('sync')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GenerationController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)('status/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GenerationController.prototype, "getStatus", null);
exports.GenerationController = GenerationController = __decorate([
    (0, common_1.Controller)('generate'),
    __metadata("design:paramtypes", [generation_service_1.GenerationService])
], GenerationController);
//# sourceMappingURL=generation.controller.js.map