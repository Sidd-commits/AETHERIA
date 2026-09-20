import { z } from 'zod';
import { LogLevel, Logger } from '../utils/logger';

/**
 * Environment Variables Schema Definition
 */
export const EnvSchema = z.object({
  VITE_OPENAI_API_KEY: z.string().optional().default(''),
  VITE_APP_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VITE_LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE']).default('INFO'),
  VITE_DEFAULT_PARTICLE_COUNT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1000).max(30000))
    .optional()
    .default('10000'),
  VITE_ENABLE_AI_VOICE: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .optional()
    .default('true')
});

export type AppEnvironment = z.infer<typeof EnvSchema>;

/**
 * Validated Environment Configuration
 */
function loadEnvironment(): AppEnvironment {
  const rawEnv = {
    VITE_OPENAI_API_KEY: import.meta.env?.VITE_OPENAI_API_KEY,
    VITE_APP_ENV: import.meta.env?.VITE_APP_ENV || import.meta.env?.MODE,
    VITE_LOG_LEVEL: import.meta.env?.VITE_LOG_LEVEL,
    VITE_DEFAULT_PARTICLE_COUNT: import.meta.env?.VITE_DEFAULT_PARTICLE_COUNT,
    VITE_ENABLE_AI_VOICE: import.meta.env?.VITE_ENABLE_AI_VOICE
  };

  const parseResult = EnvSchema.safeParse(rawEnv);

  if (!parseResult.success) {
    console.error('❌ Environment validation failed:', parseResult.error.format());
    // Fall back to defaults rather than crashing in production
    return EnvSchema.parse({});
  }

  return parseResult.data;
}

export const ENV: AppEnvironment = loadEnvironment();

// Synchronize Logger with ENV.VITE_LOG_LEVEL
const levelMap: Record<string, LogLevel> = {
  DEBUG: LogLevel.DEBUG,
  INFO: LogLevel.INFO,
  WARN: LogLevel.WARN,
  ERROR: LogLevel.ERROR,
  NONE: LogLevel.NONE
};

if (ENV.VITE_LOG_LEVEL && levelMap[ENV.VITE_LOG_LEVEL] !== undefined) {
  Logger.setLevel(levelMap[ENV.VITE_LOG_LEVEL]!);
}
