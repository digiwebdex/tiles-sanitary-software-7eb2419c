import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  name: string;
  email: string;
  dealer_id: string | null;
  status: string;
}

interface UserRole {
  role: "super_admin" | "dealer_admin" | "salesman";
}

interface Subscription {
  id: string;
  dealer_id: string;
  plan_id: string;
  status: "active" | "expired" | "suspended";
  start_date: string;
  end_date: string | null;
}

export type AccessLevel = "full" | "grace" | "readonly" | "blocked";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  subscription: Subscription | null;
  accessLevel: AccessLevel;
  isSuperAdmin: boolean;
  isDealerAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * Computes access level based on role and subscription state.
 *
 * Rules:
 *  1. super_admin  → always "full", subscription never checked
 *  2. dealer_admin / salesman with no dealer_id → "blocked"
 *  3. dealer_admin / salesman subscription states → full / grace / readonly / blocked
 *  4. Any other authenticated user (edge case) → "full"
 */
function computeAccessLevel(
  sub: Subscription | null,
  fetchedRoles: UserRole[],
  dealerId: string | null
): AccessLevel {
  const isSuperAdmin = fetchedRoles.some((r) => r.role === "super_admin");
  const isDealerRole = fetchedRoles.some(
    (r) => r.role === "dealer_admin" || r.role === "salesman"
  );

  // Rule 1: super_admin always gets full access
  if (isSuperAdmin) return "full";

  // Rule 2: dealer roles without a dealer_id are blocked
  if (isDealerRole && !dealerId) return "blocked";

  // Rule 3: apply subscription logic for dealer roles
  if (isDealerRole) {
    if (!sub) return "blocked";
    if (sub.status === "active") return "full";
    if (sub.status === "suspended") return "blocked";

    // expired — check 3-day grace period
    if (sub.end_date) {
      const graceEnd = new Date(sub.end_date);
      graceEnd.setDate(graceEnd.getDate() + 3);
      if (new Date() <= graceEnd) return "grace";
    }

    return "readonly";
  }

  // Rule 4: any other authenticated role gets full access
  return "full";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep a ref of loaded roles so we can compute access synchronously
  // inside loadUserData before React re-renders.
  const loadedRolesRef = useRef<UserRole[]>([]);

  const isSuperAdmin = roles.some((r) => r.role === "super_admin");
  const isDealerAdmin = roles.some((r) => r.role === "dealer_admin");
  const accessLevel = computeAccessLevel(subscription, roles, profile?.dealer_id ?? null);

  async function loadUserData(userId: string) {
    // Fetch profile and roles in parallel
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const prof = profileRes.data as Profile | null;
    const fetchedRoles = (rolesRes.data as UserRole[]) ?? [];

    // Persist in ref for synchronous checks below
    loadedRolesRef.current = fetchedRoles;

    const userIsSuperAdmin = fetchedRoles.some((r) => r.role === "super_admin");
    const userIsDealerRole = fetchedRoles.some(
      (r) => r.role === "dealer_admin" || r.role === "salesman"
    );

    // Set profile & roles together so the first render after loading
    // already has the correct role context.
    setProfile(prof);
    setRoles(fetchedRoles);

    // Only fetch subscription for dealer roles that have a dealer_id.
    // Super admins never need a subscription check.
    if (userIsDealerRole && !userIsSuperAdmin && prof?.dealer_id) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("dealer_id", prof.dealer_id)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      setSubscription(sub as Subscription | null);

      // Fire-and-forget background status refresh — never blocks login
      if (sub) {
        supabase.functions
          .invoke("check-subscription-status", { body: { dealer_id: prof.dealer_id } })
          .then(() =>
            supabase
              .from("subscriptions")
              .select("*")
              .eq("dealer_id", prof.dealer_id)
              .order("start_date", { ascending: false })
              .limit(1)
              .maybeSingle()
              .then(({ data: refreshed }) => {
                if (refreshed) setSubscription(refreshed as Subscription);
              })
          )
          .catch(() => { /* never block login on background errors */ });
      }
    } else {
      // super_admin or user with no dealer role — no subscription needed
      setSubscription(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadUserData(session.user.id);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        // Only clear loading after ALL data (profile, roles, subscription) is set.
        // This prevents ProtectedRoute from evaluating with stale/empty state.
        if (isMounted) setLoading(false);
      }
    };

    initialize();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer to avoid Supabase auth deadlock
          setTimeout(async () => {
            if (!isMounted) return;
            await loadUserData(session.user.id);
            if (isMounted) setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setSubscription(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      authSub.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setSubscription(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        subscription,
        accessLevel,
        isSuperAdmin,
        isDealerAdmin,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
