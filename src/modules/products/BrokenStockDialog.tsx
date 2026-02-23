import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { stockService } from "@/services/stockService";

interface BrokenStockDialogProps {
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

const BrokenStockDialog = ({ open, onOpenChange, product, dealerId, onSuccess }: BrokenStockDialogProps) => {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const qty = Number(quantity);
      if (!qty || qty <= 0) throw new Error("Quantity must be > 0");
      if (!product) throw new Error("No product selected");
      await stockService.deductBrokenStock(product.id, qty, dealerId, reason || "Broken/Damaged");
    },
    onSuccess: () => {
      toast.success("Broken stock deducted successfully");
      setQuantity("");
      setReason("");
      onSuccess();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!product) return null;

  const unitLabel = product.unit_type === "box_sft" ? "Boxes" : "Pieces";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as Broken</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <strong>{product.sku}</strong> — {product.name}
          </p>
          <div>
            <Label>Quantity ({unitLabel})</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`Enter ${unitLabel.toLowerCase()}`}
            />
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Broken during transport, damaged in storage…"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !quantity}
          >
            {mutation.isPending ? "Processing…" : "Deduct Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BrokenStockDialog;
