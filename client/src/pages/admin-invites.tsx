import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Plus, Copy, Check } from "lucide-react";
import { adminApiRequest } from "@/lib/adminQueryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminInvitesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [accountType, setAccountType] = useState<"analyst" | "investor" | "admin">("investor");
  const [maxUses, setMaxUses] = useState("1");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [notes, setNotes] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: inviteCodes, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/invite-codes"],
    queryFn: async () => {
      const res = await adminApiRequest("/api/admin/invite-codes");
      if (!res.ok) throw new Error("Failed to fetch invite codes");
      return res.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/invite-codes/stats"],
    queryFn: async () => {
      const res = await adminApiRequest("/api/admin/invite-codes/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await adminApiRequest("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create invite code");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invite Code Created",
        description: `Code: ${data.code}`,
      });
      refetch();
      setShowCreateDialog(false);
      setNotes("");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (codeId: number) => {
      const res = await adminApiRequest(`/api/admin/invite-codes/${codeId}/deactivate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to deactivate code");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Code Deactivated",
        description: "The invite code has been deactivated",
      });
      refetch();
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      accountType,
      maxUses: parseInt(maxUses),
      expiresInDays: parseInt(expiresInDays),
      notes,
    });
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard",
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin/panel")}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Admin Panel
          </Button>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Generate Invite Code
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Uses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.used || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">By Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1">
              <div>Analyst: {stats?.byType?.analyst || 0}</div>
              <div>Investor: {stats?.byType?.investor || 0}</div>
              <div>Admin: {stats?.byType?.admin || 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invite Codes</CardTitle>
          <CardDescription>Manage account creation invite codes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inviteCodes?.codes?.map((code: any) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        {code.code}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(code.code)}
                        >
                          {copiedCode === code.code ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{code.accountType}</Badge>
                    </TableCell>
                    <TableCell>
                      {code.currentUses} / {code.maxUses}
                    </TableCell>
                    <TableCell>
                      {code.expiresAt
                        ? new Date(code.expiresAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      {code.isActive ? (
                        <Badge className="bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{code.notes || "-"}</TableCell>
                    <TableCell>
                      {code.isActive && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deactivateMutation.mutate(code.id)}
                        >
                          Deactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invite Code</DialogTitle>
            <DialogDescription>
              Create a new invite code for account registration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Account Type</Label>
              <Select value={accountType} onValueChange={(v: any) => setAccountType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="investor">Investor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Maximum Uses</Label>
              <Input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                min="1"
              />
            </div>
            <div>
              <Label>Expires In (Days)</Label>
              <Input
                type="number"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                min="1"
              />
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., For Q1 2026 investors"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Generating..." : "Generate Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
