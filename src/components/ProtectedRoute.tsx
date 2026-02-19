import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Routes allowed in readonly mode (dashboard, reports) */
  allowReadonly?: boolean;
}

const ProtectedRoute = ({ children, allowReadonly = false }: ProtectedRouteProps) => {
  const { user, loading, accessLevel, profile, isSuperAdmin } = useAuth();
  const location = useLocation();

  // Audit log for non-super-admin restricted access attempts
  useEffect(() => {
    if (
      !loading &&
      user &&
      !isSuperAdmin &&
      (accessLevel === "readonly" || accessLevel === "blocked") &&
      !allowReadonly
    ) {
      supabase
        .from("audit_logs")
        .insert([{
          dealer_id: profile?.dealer_id ?? null,
          user_id: user.id,
          action: "EXPIRED_SUBSCRIPTION_ACCESS",
          table_name: "route_guard",
          record_id: location.pathname,
          new_data: {
            access_level: accessLevel,
            path: location.pathname,
            timestamp: new Date().toISOString(),
          } as any,
        }])
        .then(() => {});
    }
  }, [loading, user, accessLevel, allowReadonly, location.pathname, isSuperAdmin]);

  // 1. Wait until profile, roles, and subscription are all loaded
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  // 2. Unauthenticated → login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. super_admin → always full access, never check subscription
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // 4. dealer_admin / salesman subscription enforcement
  if (accessLevel === "blocked") {
    return <Navigate to="/subscription-blocked" replace />;
  }

  if (accessLevel === "readonly" && !allowReadonly) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
