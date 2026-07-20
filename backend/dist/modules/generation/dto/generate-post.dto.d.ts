import { z } from 'zod';
export declare const GeneratePostSchema: z.ZodObject<{
    topic: z.ZodString;
    audience: z.ZodString;
    tone: z.ZodString;
    length: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type GeneratePostDto = z.infer<typeof GeneratePostSchema>;
