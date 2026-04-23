import { z } from "zod";

const serverSchema = z.object({
  AUTH_SECRET: z.string().min(1).optional(),
  AUTH_OPERATOR_PASSPHRASE: z.string().optional(),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional().default("http://localhost:8000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_AUTH_GITHUB_AVAILABLE: z.enum(["0", "1"]).optional(),
  NEXT_PUBLIC_AUTH_GOOGLE_AVAILABLE: z.enum(["0", "1"]).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().optional().default("RAGHUPATHI"),
});

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;
export type FullEnv = ServerEnv & ClientEnv;

const processEnv = {
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_AUTH_GITHUB_AVAILABLE: process.env.NEXT_PUBLIC_AUTH_GITHUB_AVAILABLE,
  NEXT_PUBLIC_AUTH_GOOGLE_AVAILABLE: process.env.NEXT_PUBLIC_AUTH_GOOGLE_AVAILABLE,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_OPERATOR_PASSPHRASE: process.env.AUTH_OPERATOR_PASSPHRASE,
  AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
  AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

export function validateEnv(): FullEnv {
  if (
    process.env.SKIP_ENV_VALIDATION === "1" ||
    process.env.SKIP_ENV_VALIDATION === "true"
  ) {
    console.log("⚠️ Skipping environment validation (SKIP_ENV_VALIDATION is set)");
    return processEnv as unknown as FullEnv;
  }

  const isServer = typeof window === "undefined";

  const clientParsed = clientSchema.safeParse(processEnv);
  const serverParsed = isServer
    ? serverSchema.safeParse(processEnv)
    : { success: true as const, data: {} as ServerEnv };

  if (!clientParsed.success || (isServer && !serverParsed.success)) {
    // ALWAYS return something during build/dev
    console.warn("⚠️ Environment validation failed. Using partial/default data.");
    return {
      ...processEnv,
      ...(clientParsed.success ? clientParsed.data : {}),
      ...(isServer && serverParsed.success ? serverParsed.data : {}),
    } as unknown as FullEnv;
  }

  return {
    ...clientParsed.data,
    ...(isServer ? (serverParsed as any).data : {}),
  } as FullEnv;
}

const env = validateEnv();
export { env };
