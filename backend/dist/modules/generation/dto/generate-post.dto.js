"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneratePostSchema = void 0;
const zod_1 = require("zod");
exports.GeneratePostSchema = zod_1.z.object({
    topic: zod_1.z.string().min(3, 'Topic must be at least 3 characters long'),
    audience: zod_1.z.string().min(2, 'Audience is required'),
    tone: zod_1.z.string().min(2, 'Tone is required'),
    length: zod_1.z.string().default('medium'),
});
//# sourceMappingURL=generate-post.dto.js.map