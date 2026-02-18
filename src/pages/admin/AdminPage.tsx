import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarPlus, Shield } from "lucide-react";

const AdminPage = () => {
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, dealers(name), plans(name)")
        .order("start_date", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: isSuperAdmin,
  });

  const extendMutation = useMutation({
    mutationFn: async ({ subId, newEndDate, newStatus }: { subId: string; newEndDate: string; newStatus: string }) => {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          end_date: newEndDate,
          status: newStatus as any,
        })
        .eq("id", subId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Subscription updated" });
      qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (e: Error) => {
      toast({ variant: "destructive", title: "Error", description: e.message });
    },
  });

  const [editId, setEditId] = useState<string | null>(null);
  const [editEndDate, setEditEndDate] = useState("");
  const [editStatus, setEditStatus] = useState("active");

  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <p className="text-destructive">Access denied. Super admin only.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Admin — Subscription Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="w-48">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No subscriptions
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.dealers?.name ?? "—"}</TableCell>
                        <TableCell>{sub.plans?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              sub.status === "active" ? "default" :
                              sub.status === "expired" ? "destructive" : "secondary"
                            }
                            className="capitalize text-xs"
                          >
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{sub.start_date}</TableCell>
                        <TableCell>{sub.end_date ?? "—"}</TableCell>
                        <TableCell>
                          {editId === sub.id ? (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <Input
                                  type="date"
                                  value={editEndDate}
                                  onChange={(e) => setEditEndDate(e.target.value)}
                                  className="h-8 text-xs"
                                />
                                <Select value={editStatus} onValueChange={setEditStatus}>
                                  <SelectTrigger className="h-8 w-24 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                    <SelectItem value="suspended">Suspended</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    extendMutation.mutate({
                                      subId: sub.id,
                                      newEndDate: editEndDate,
                                      newStatus: editStatus,
                                    });
                                    setEditId(null);
                                  }}
                                >
                                  Save
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                setEditId(sub.id);
                                setEditEndDate(sub.end_date ?? "");
                                setEditStatus(sub.status);
                              }}
                            >
                              <CalendarPlus className="mr-1 h-3 w-3" /> Extend
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;
