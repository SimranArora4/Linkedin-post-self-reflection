import { z } from 'zod';
export declare const EnvSchema: z.ZodObject<{
    PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        production: "production";
        test: "test";
    }>>;
    OPENAI_API_KEY: z.ZodString;
    MAX_ITERATIONS: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    MIN_SCORE: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    OPENAI_MODEL: z.ZodDefault<z.ZodString>;
    OPENAI_TEMPERATURE: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type EnvConfig = z.infer<typeof EnvSchema>;
export declare const validateEnv: (config: Record<string, unknown>) => {
    PORT: number;
    NODE_ENV: "development" | "production" | "test";
    OPENAI_API_KEY: string;
    MAX_ITERATIONS: number;
    MIN_SCORE: number;
    OPENAI_MODEL: string;
    OPENAI_TEMPERATURE: number;
};
