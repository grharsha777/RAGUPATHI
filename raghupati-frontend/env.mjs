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

let env = process.env;

export function validateEnv() {
  const serverParsed = serverSchema.safeParse(processEnv);
  const clientParsed = clientSchema.safeParse(processEnv);

  if (!serverParsed.success || !clientParsed.success) {
    console.error("❌ Invalid environment variables:", {
      server: serverParsed.success ? null : serverParsed.error.format(),
      client: clientParsed.success ? null : clientParsed.error.format(),
    });
    throw new Error("Invalid environment variables");
  }

  return { ...serverParsed.data, ...clientParsed.data };
}

env = validateEnv();

export { env };
