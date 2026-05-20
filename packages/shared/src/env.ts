import { z } from 'zod';

/** Zod schema for validating environment variables. */
export const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_CLIENT_SECRET: z.string().min(1, 'DISCORD_CLIENT_SECRET is required'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  DEEPL_API_KEY: z.string().optional(),
  BOT_API_SECRET: z.string().min(1, 'BOT_API_SECRET is required'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/** Validates environment variables against the schema. */
export function validateEnv(env: Record<string, string | undefined>): EnvConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  return result.data;
}
