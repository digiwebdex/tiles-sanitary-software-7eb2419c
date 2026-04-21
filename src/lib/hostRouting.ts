/**
 * Host-based routing helpers.
 *
 * Production layout (single SPA bundle, host-based routing in nginx):
 *   sanitileserp.com         → marketing landing ("/")
 *   app.sanitileserp.com     → ERP, root "/" rewrites to "/login"
 *   portal.sanitileserp.com  → Portal, root "/" rewrites to "/portal/login"
 *
 * Nginx already does the server-side 302 from "/" to the right entry on each
 * subdomain. These helpers cover client-side navigation cases (e.g. logout
 * pushing the router back to "/") so users still land on the right section
 * without a full page reload bouncing through nginx.
 */

export type AppHost = "marketing" | "app" | "portal" | "unknown";

const APP_HOSTS = new Set(["app.sanitileserp.com"]);
const PORTAL_HOSTS = new Set(["portal.sanitileserp.com"]);
const MARKETING_HOSTS = new Set([
  "sanitileserp.com",
  "www.sanitileserp.com",
]);

export function getAppHost(hostname: string = window.location.hostname): AppHost {
  if (APP_HOSTS.has(hostname)) return "app";
  if (PORTAL_HOSTS.has(hostname)) return "portal";
  if (MARKETING_HOSTS.has(hostname)) return "marketing";
  return "unknown";
}

/**
 * Map root path "/" to the correct entry path for the current host.
 * Returns null if no client-side redirect is needed.
 */
export function getHostEntryRedirect(
  pathname: string = window.location.pathname,
  hostname: string = window.location.hostname,
): string | null {
  if (pathname !== "/") return null;
  const host = getAppHost(hostname);
  if (host === "app") return "/login";
  if (host === "portal") return "/portal/login";
  return null;
}
