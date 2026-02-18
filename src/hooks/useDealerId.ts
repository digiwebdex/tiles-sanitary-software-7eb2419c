import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the authenticated user's dealer_id.
 * Throws if no dealer_id is available (user not linked to a dealer).
 * This is the ONLY source of dealer_id for all frontend operations.
 */
export function useDealerId(): string {
  const { profile, isSuperAdmin } = useAuth();
  const dealerId = profile?.dealer_id;

  if (!dealerId && !isSuperAdmin) {
    throw new Error("No dealer_id found for the current user. Access denied.");
  }

  return dealerId ?? "";
}
