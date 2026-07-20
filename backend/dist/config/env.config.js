"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = exports.EnvSchema = void 0;
const zod_1 = require("zod");
exports.EnvSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(8080),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    OPENAI_API_KEY: zod_1.z.string().min(1, 'OPENAI_API_KEY is required'),
    MAX_ITERATIONS: zod_1.z.coerce.number().int().positive().default(5),
    MIN_SCORE: zod_1.z.coerce.number().min(0).max(10).default(9),
    OPENAI_MODEL: zod_1.z.string().default('gpt-4o-mini'),
    OPENAI_TEMPERATURE: zod_1.z.coerce.number().min(0).max(2).default(0.7),
});
const validateEnv = (config) => {
    const result = exports.EnvSchema.safeParse(config);
    if (!result.success) {
        console.error('❌ Invalid environment configuration:');
        console.error(JSON.stringify(result.error.format(), null, 2));
        throw new Error('Invalid environment configuration');
    }
    return result.data;
};
exports.validateEnv = validateEnv;
//# sourceMappingURL=env.config.js.map