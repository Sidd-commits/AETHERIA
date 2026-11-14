import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  FRONTEND_ORIGIN: z.string().default('http://localhost:3000,http://localhost:8080'),
  OPENAI_API_KEY: z.string().optional().default(''),
  RATE_LIMIT_MAX_REQUESTS_PER_MINUTE: z.coerce.number().default(120)
});

export type EnvConfig = z.infer<typeof envSchema>;

function parseEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid backend environment configuration:', result.error.format());
    throw new Error('Invalid backend environment configuration');
  }
  return result.data;
}

export const env = parseEnv();
