import { useAuth } from "@/contexts/AuthContext";

export interface Permissions {
  canViewCostPrice: boolean;
  canViewProfit: boolean;
  canViewMargin: boolean;
  canEditPrices: boolean;
  canAdjustStock: boolean;
  canOverrideCredit: boolean;
  canRecordCollections: boolean;
  canDeleteRecords: boolean;
  canExportReports: boolean;
  canManageUsers: boolean;
  canViewSupplierLedger: boolean;
  canViewExpenseLedger: boolean;
  canViewFinancialDashboard: boolean;
  isDealerAdmin: boolean;
  isSalesman: boolean;
  isSuperAdmin: boolean;
}

export function usePermissions(): Permissions {
  const { roles, isSuperAdmin, isDealerAdmin } = useAuth();
  const isSalesman = roles.some((r) => r.role === "salesman");

  // Dealer admin and super admin get full access
  const isPrivileged = isDealerAdmin || isSuperAdmin;

  return {
    canViewCostPrice: isPrivileged,
    canViewProfit: isPrivileged,
    canViewMargin: isPrivileged,
    canEditPrices: isPrivileged,
    canAdjustStock: isPrivileged,
    canOverrideCredit: isPrivileged,
    canRecordCollections: isPrivileged,
    canDeleteRecords: isPrivileged,
    canExportReports: isPrivileged,
    canManageUsers: isPrivileged,
    canViewSupplierLedger: isPrivileged,
    canViewExpenseLedger: isPrivileged,
    canViewFinancialDashboard: isPrivileged,
    isDealerAdmin,
    isSalesman,
    isSuperAdmin,
  };
}
