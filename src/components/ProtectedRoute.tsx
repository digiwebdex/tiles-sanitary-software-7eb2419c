import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, AccessLevel } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Routes allowed in readonly mode (dashboard, reports) */
  allowReadonly?: boolean;
}

const ProtectedRoute = ({ children, allowReadonly = false }: ProtectedRouteProps) => {
  const { user, loading, accessLevel } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Blocked = no subscription at all
  if (accessLevel === "blocked") {
    return <Navigate to="/subscription-blocked" replace />;
  }

  // Read-only mode: only allow readonly-permitted routes
  if (accessLevel === "readonly" && !allowReadonly) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
