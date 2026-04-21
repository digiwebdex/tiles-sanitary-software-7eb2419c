/**
 * VpsAuthContext — Phase 1 self-hosted auth context.
 *
 * Mounted ONLY when env.AUTH_BACKEND === "vps". Provides the same surface
 * area features expect (`user`, `loading`, `signOut`) so the rest of the
 * app reading from `useAuth()` keeps working (Phase 2 unifies the read path).
 *
 * Notes:
 *   - This context never touches Supabase auth.
 *   - Subscription validation/access level is left to Phase 3 — for Phase 1
 *     we expose `accessLevel: "full"` for any authenticated VPS user, since
 *     this rollout phase is opt-in via env flag and dealers must explicitly
 *     migrate. No subscription regression is introduced for default users.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { vpsAuthApi, vpsTokenStore, type VpsUser } from "@/lib/vpsAuthClient";

interface VpsProfile {
  id: string;
  email: string;
  name: string;
  dealer_id: string | null;
  status: string;
}

interface VpsAuthCtx {
  user: VpsUser | null;
  profile: VpsProfile | null;
  roles: { role: string }[];
  loading: boolean;
  isSuperAdmin: boolean;
  isDealerAdmin: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<VpsAuthCtx | null>(null);

export function useVpsAuth(): VpsAuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useVpsAuth must be used within VpsAuthProvider");
  return c;
}

export function VpsAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<VpsUser | null>(vpsTokenStore.user);
  const [loading, setLoading] = useState(true);

  const profile: VpsProfile | null = user
    ? {
        id: user.userId,
        email: user.email,
        name: user.email,
        dealer_id: user.dealerId,
        status: "active",
      }
    : null;

  const roles = user ? user.roles.map((r) => ({ role: r })) : [];
  const isSuperAdmin = roles.some((r) => r.role === "super_admin");
  const isDealerAdmin = roles.some((r) => r.role === "dealer_admin");

  async function bootstrap() {
    setLoading(true);
    try {
      // Validate any persisted token by hitting /me; refresh path runs
      // automatically on 401 inside vpsAuthedFetch.
      const me = await vpsAuthApi.me();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrap();
    // Keep tab in sync if another tab logs out.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "vps.accessToken" || e.key === "vps.user") {
        setUser(vpsTokenStore.user);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const signOut = async () => {
    await vpsAuthApi.logout();
    setUser(null);
  };

  const refresh = async () => {
    await bootstrap();
  };

  return (
    <Ctx.Provider
      value={{ user, profile, roles, loading, isSuperAdmin, isDealerAdmin, signOut, refresh }}
    >
      {children}
    </Ctx.Provider>
  );
}
