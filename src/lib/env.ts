/** Centralized environment configuration with validation */

function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback = ""): string {
  const v = import.meta.env[key];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

/**
 * Phase 1 auth-backend toggle.
 *   "supabase" (default) → existing Supabase auth path is unchanged.
 *   "vps"                → frontend authBridge talks to the self-hosted API.
 *
 * Flip to "vps" by setting `VITE_AUTH_BACKEND=vps` at build time.
 * Switching back to "supabase" is an instant rollback (rebuild + redeploy).
 */
export type AuthBackend = "supabase" | "vps";

const rawBackend = optionalEnv("VITE_AUTH_BACKEND", "supabase").toLowerCase();
const AUTH_BACKEND: AuthBackend = rawBackend === "vps" ? "vps" : "supabase";

export const env = {
  SUPABASE_URL: requireEnv("VITE_SUPABASE_URL"),
  SUPABASE_ANON_KEY: requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
  AUTH_BACKEND,
  VPS_API_BASE: optionalEnv("VITE_VPS_API_BASE", "https://api.sanitileserp.com"),
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
  MODE: import.meta.env.MODE as string,
} as const;
