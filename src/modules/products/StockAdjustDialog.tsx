import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { stockService } from "@/services/stockService";
import { logAudit } from "@/services/auditService";
import { useAuth } from "@/contexts/AuthContext";
import {
  getApprovalSettings, isApprovalRequired, createApprovalRequest,
  findValidApproval, consumeApprovalRequest, generateActionHash,
  type ApprovalContextData,
} from "@/services/approvalService";
import { ApprovalRequestDialog } from "@/components/approval/ApprovalRequestDialog";

interface StockAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    sku: string;
    unit_type: string;
  } | null;
  dealerId: string;
  onSuccess: () => void;
}

const StockAdjustDialog = ({ open, onOpenChange, product, dealerId, onSuccess }: StockAdjustDialogProps) => {
  const { user, isDealerAdmin } = useAuth();
  const [quantity, setQuantity] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "deduct">("add");
  const [reason, setReason] = useState("");
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalContext, setApprovalContext] = useState<ApprovalContextData>({});
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof getApprovalSettings>> | null>(null);

  useEffect(() => {
    if (open && dealerId) {
      getApprovalSettings(dealerId).then(setSettings).catch(() => {});
    }
  }, [open, dealerId]);

  const performAdjust = async () => {
    const qty = Number(quantity);
    await stockService.adjustStock(product!.id, qty, adjustType, dealerId);
    await logAudit({
      dealer_id: dealerId,
      action: `stock_manual_${adjustType}`,
      table_name: "stock",
      record_id: product!.id,
      new_data: { quantity: qty, type: adjustType, reason: reason.trim() },
    });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const qty = Number(quantity);
      if (!qty || qty <= 0) throw new Error("Quantity must be > 0");
      if (!reason.trim()) throw new Error("Reason is required");
      if (!product) throw new Error("No product selected");

      // Approval gate
      if (settings && isApprovalRequired(settings, "stock_adjustment")) {
        const ctx: ApprovalContextData = {
          product_name: product.name,
          adjustment_type: adjustType,
          adjustment_qty: qty,
        };
        const existing = await findValidApproval(dealerId, "stock_adjustment", ctx);
        if (existing) {
          const hash = await generateActionHash("stock_adjustment", ctx);
          await consumeApprovalRequest(existing.id, hash);
        } else if (isDealerAdmin && settings.auto_approve_for_admins) {
          await createApprovalRequest({
            dealerId, approvalType: "stock_adjustment",
            sourceType: "stock_adjustment", requestedBy: user!.id,
            reason: reason.trim(), context: ctx, isAdmin: true,
            autoApproveForAdmins: true,
          });
        } else {
          setApprovalContext(ctx);
          setApprovalDialogOpen(true);
          throw new Error("__APPROVAL_PENDING__");
        }
      }

      await performAdjust();
    },
    onSuccess: () => {
      toast.success(`Stock ${adjustType === "add" ? "added" : "deducted"} successfully`);
      setQuantity(""); setReason(""); setAdjustType("add");
      onSuccess();
    },
    onError: (e: any) => {
      if (e.message !== "__APPROVAL_PENDING__") toast.error(e.message);
    },
  });

  const handleApprovalRequest = async (note: string) => {
    try {
      await createApprovalRequest({
        dealerId, approvalType: "stock_adjustment",
        sourceType: "stock_adjustment", requestedBy: user!.id,
        reason: note || reason.trim(), context: approvalContext, isAdmin: false,
      });
      toast.success("Approval request submitted. Wait for manager approval.");
      setApprovalDialogOpen(false);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!product) return null;
  const unitLabel = product.unit_type === "box_sft" ? "Boxes" : "Pieces";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong>{product.sku}</strong> — {product.name}
            </p>
            <div>
              <Label>Adjustment Type *</Label>
              <Select value={adjustType} onValueChange={(v) => setAdjustType(v as "add" | "deduct")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Stock</SelectItem>
                  <SelectItem value="deduct">Deduct Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity ({unitLabel}) *</Label>
              <Input type="number" step="0.01" min="0.01" value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={`Enter ${unitLabel.toLowerCase()}`} />
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Physical count correction, damaged goods…" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !quantity || !reason.trim()}>
              {mutation.isPending ? "Processing…" : adjustType === "add" ? "Add Stock" : "Deduct Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ApprovalRequestDialog
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        onRequestApproval={handleApprovalRequest}
        approvalType="stock_adjustment"
        context={approvalContext}
      />
    </>
  );
};

export default StockAdjustDialog;
