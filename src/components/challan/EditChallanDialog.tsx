import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface EditChallanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challan: any;
  onSave: (updates: {
    challan_date: string;
    driver_name: string;
    transport_name: string;
    vehicle_no: string;
    notes: string;
  }) => void;
  isPending?: boolean;
}

const EditChallanDialog = ({ open, onOpenChange, challan, onSave, isPending }: EditChallanDialogProps) => {
  const [challanDate, setChallanDate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [transportName, setTransportName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (challan && open) {
      setChallanDate(challan.challan_date ?? "");
      setDriverName(challan.driver_name ?? "");
      setTransportName(challan.transport_name ?? "");
      setVehicleNo(challan.vehicle_no ?? "");
      setNotes(challan.notes ?? "");
    }
  }, [challan, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ challan_date: challanDate, driver_name: driverName, transport_name: transportName, vehicle_no: vehicleNo, notes });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Challan — {challan?.challan_no}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="challan_date">Challan Date</Label>
            <Input id="challan_date" type="date" value={challanDate} onChange={(e) => setChallanDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driver_name">Driver Name</Label>
            <Input id="driver_name" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Driver name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transport_name">Transport Name</Label>
            <Input id="transport_name" value={transportName} onChange={(e) => setTransportName(e.target.value)} placeholder="Transport company" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle_no">Vehicle No</Label>
            <Input id="vehicle_no" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="Vehicle number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes" rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditChallanDialog;
