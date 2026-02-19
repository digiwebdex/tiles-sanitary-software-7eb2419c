/**
 * Lightweight scoped logger with dev/prod toggle.
 *
 * In development  → all levels printed to the console.
 * In production   → only "warn" and "error" are printed; "debug" and "info"
 *                   are silenced so subscription internals stay out of prod logs.
 *
 * Usage:
 *   import { createLogger } from "@/lib/logger";
 *   const log = createLogger("SubscriptionDebug");
 *
 *   log.debug("parsed endDate:", date);   // dev-only
 *   log.info("Status corrected →", val);  // dev-only
 *   log.warn("No end_date found");        // always visible
 *   log.error("Fetch error:", err);       // always visible
 */

const IS_DEV = import.meta.env.DEV;

export interface Logger {
  /** Dev-only. Silent in production. Use for verbose internal state traces. */
  debug: (...args: unknown[]) => void;
  /** Dev-only. Silent in production. Use for normal operational messages. */
  info: (...args: unknown[]) => void;
  /** Always logged. Use for recoverable anomalies. */
  warn: (...args: unknown[]) => void;
  /** Always logged. Use for errors that affect functionality. */
  error: (...args: unknown[]) => void;
}

/**
 * Creates a namespaced logger.
 * @param namespace - Prefix shown before every message, e.g. "SubscriptionDebug"
 */
export function createLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`;

  return {
    debug: IS_DEV ? (...args) => console.log(prefix, ...args) : () => {},
    info:  IS_DEV ? (...args) => console.info(prefix, ...args) : () => {},
    warn:             (...args) => console.warn(prefix, ...args),
    error:            (...args) => console.error(prefix, ...args),
  };
}

/**
 * Pre-built logger for the subscription lifecycle module.
 * Import this directly instead of calling createLogger yourself.
 */
export const subLog = createLogger("SubscriptionDebug");
