import { z } from "zod";

const serverSchema = z.object({
  AUTH_SECRET: z.string().min(1),
  AUTH_OPERATOR_PASSPHRASE: z.string().optional(),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_AUTH_GITHUB_AVAILABLE: z.enum(["0", "1"]).optional(),
  NEXT_PUBLIC_AUTH_GOOGLE_AVAILABLE: z.enum(["0", "1"]).optional(),
});

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;
export type FullEnv = ServerEnv & ClientEnv;

// Using process.env for all variables since they are defined in ../.env.local
const processEnv = {
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_AUTH_GITHUB_AVAILABLE: process.env.NEXT_PUBLIC_AUTH_GITHUB_AVAILABLE,
  NEXT_PUBLIC_AUTH_GOOGLE_AVAILABLE: process.env.NEXT_PUBLIC_AUTH_GOOGLE_AVAILABLE,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_OPERATOR_PASSPHRASE: process.env.AUTH_OPERATOR_PASSPHRASE,
  AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
  AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
};


export function validateEnv() {
  if (process.env.SKIP_ENV_VALIDATION === "1" || process.env.SKIP_ENV_VALIDATION === "true") {
    console.log("⚠️ Skipping environment validation (SKIP_ENV_VALIDATION is set)");
    return processEnv as unknown as FullEnv;
  }

  const isServer = typeof window === "undefined";
  
  // Always validate client schema
  const clientParsed = clientSchema.safeParse(processEnv);
  
  // Only validate server schema on the server
  const serverParsed = isServer 
    ? serverSchema.safeParse(processEnv)
    : { success: true, data: {} };

  if (!clientParsed.success || (isServer && !serverParsed.success)) {
    // During build on Vercel, we might want to be more lenient if variables are missing
    if (process.env.VERCEL === "1") {
      console.warn("⚠️ Invalid environment variables detected during Vercel build. Proceeding anyway...");
      return processEnv as unknown as FullEnv;
    }

    console.error("❌ Invalid environment variables:", {
      server: !isServer ? "Skipped (Browser)" : (serverParsed.success ? null : (serverParsed as any).error.format()),
      client: clientParsed.success ? null : clientParsed.error.format(),
    });
    throw new Error("Invalid environment variables");
  }

  return { 
    ...clientParsed.data, 
    ...(isServer ? (serverParsed as any).data : {}) 
  } as FullEnv;
}

const env = validateEnv();

export { env };
