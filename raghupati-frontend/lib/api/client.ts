import { z } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function getBaseUrl(): string {
  // 1. Explicitly check for browser-side injected public variable
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "";
  }

  // 2. Server-side logic (SSR/Server Actions)
  // Favor private API_BASE_URL, then NEXT_PUBLIC_API_BASE_URL
  const explicit = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (explicit && !explicit.includes("localhost")) {
    return explicit;
  }

  // 3. Fallback for Vercel Preview/Production URLs
  if (process.env.VERCEL_URL) {
    // If you are using a reverse proxy or same-repo backend
    return `https://${process.env.VERCEL_URL}`;
  }

  // 4. Local development default
  return explicit || "http://localhost:8000";
}

export async function apiFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit & { accessToken?: string },
): Promise<T> {
  const base = getBaseUrl().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.accessToken) {
    headers.set("Authorization", `Bearer ${init.accessToken}`);
  }
  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  const text = await response.text();
  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.status}`, response.status, text);
  }
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError("Invalid JSON response", response.status, text);
  }
  return schema.parse(json);
}
