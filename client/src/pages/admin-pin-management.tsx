import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Key, Shield, UserCheck, XCircle, Eye, RefreshCw } from "lucide-react";

type Pin = {
  id: number;
  user_id: number;
  username: string;
  email: string;
  role: string;
  permissions: any;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
};

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
};

export default function AdminPinManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [pins, setPins] = useState<Pin[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("surety");
  const [expiresInDays, setExpiresInDays] = useState<string>("90");
  const [generatedPin, setGeneratedPin] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      
      // Load PINs
      const pinsRes = await fetch("/api/admin/pins", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (pinsRes.ok) {
        const pinsData = await pinsRes.json();
        setPins(pinsData.pins || []);
      }

      // Load users for PIN generation
      const usersRes = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
    } catch (error) {
      console.error("Load data error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load PIN data",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePin = async () => {
    if (!selectedUserId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a user",
      });
      return;
    }

    setGenerating(true);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/pins/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: parseInt(selectedUserId),
          role: selectedRole,
          expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate PIN");
      }

      const data = await res.json();
      setGeneratedPin(data.pin);
      
      toast({
        title: "PIN Generated",
        description: `PIN created successfully for ${selectedRole} role`,
      });

      await loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate PIN",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDeactivatePin = async (pinId: number) => {
    if (!confirm("Are you sure you want to deactivate this PIN?")) {
      return;
    }

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/pins/${pinId}/deactivate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to deactivate PIN");
      }

      toast({
        title: "PIN Deactivated",
        description: "PIN has been deactivated successfully",
      });

      await loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to deactivate PIN",
      });
    }
  };

  const closeGenerateDialog = () => {
    setShowGenerateDialog(false);
    setSelectedUserId("");
    setSelectedRole("surety");
    setExpiresInDays("90");
    setGeneratedPin("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin-panel")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">PIN Management</h1>
            <p className="text-muted-foreground">
              Generate and manage access PINs for admin and surety users
            </p>
          </div>
        </div>

        {/* Generate PIN Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Generate New PIN
            </CardTitle>
            <CardDescription>
              Create a new PIN for admin or surety access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowGenerateDialog(true)}>
              <Key className="w-4 h-4 mr-2" />
              Generate PIN
            </Button>
          </CardContent>
        </Card>

        {/* Active PINs Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active PINs</CardTitle>
                <CardDescription>
                  All active PINs in the system
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No PINs found
                    </TableCell>
                  </TableRow>
                ) : (
                  pins.map((pin) => (
                    <TableRow key={pin.id}>
                      <TableCell className="font-medium">{pin.username}</TableCell>
                      <TableCell>{pin.email}</TableCell>
                      <TableCell>
                        <Badge variant={pin.role === "admin" ? "default" : "secondary"}>
                          {pin.role === "admin" ? (
                            <Shield className="w-3 h-3 mr-1" />
                          ) : (
                            <UserCheck className="w-3 h-3 mr-1" />
                          )}
                          {pin.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {pin.is_active ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {pin.last_used_at
                          ? new Date(pin.last_used_at).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        {pin.expires_at
                          ? new Date(pin.expires_at).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        {pin.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivatePin(pin.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Deactivate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Generate PIN Dialog */}
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Generate New PIN</DialogTitle>
              <DialogDescription>
                Create a new 6-digit PIN for a user
              </DialogDescription>
            </DialogHeader>

            {generatedPin ? (
              <div className="space-y-4">
                <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg text-center">
                  <Key className="w-12 h-12 mx-auto mb-3 text-green-600" />
                  <p className="text-sm text-muted-foreground mb-2">Generated PIN</p>
                  <p className="text-4xl font-mono font-bold text-green-700 tracking-widest">
                    {generatedPin}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    ⚠️ Save this PIN securely. It cannot be retrieved later.
                  </p>
                </div>
                <Button onClick={closeGenerateDialog} className="w-full">
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user">User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.username} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin (Full Access)</SelectItem>
                        <SelectItem value="surety">Surety (Limited Access)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {selectedRole === "admin"
                        ? "Full access to all admin features"
                        : "View-only access to surety and exchange"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expires">Expires In (Days)</Label>
                    <Input
                      id="expires"
                      type="number"
                      placeholder="90"
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for no expiration
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={closeGenerateDialog}>
                    Cancel
                  </Button>
                  <Button onClick={handleGeneratePin} disabled={generating}>
                    {generating ? "Generating..." : "Generate PIN"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
