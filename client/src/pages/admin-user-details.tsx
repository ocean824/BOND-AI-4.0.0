import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Users, Shield, UserCheck, Eye, RefreshCw } from "lucide-react";
import { PinDialog } from "@/components/PinDialog";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  has_pin: boolean;
  pin_role: string | null;
  created_at: string;
};

export default function AdminUserDetails() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState<string>("");
  const [pinVerified, setPinVerified] = useState(false);

  const handlePinSuccess = async (verifiedPin: string) => {
    setPin(verifiedPin);
    setPinVerified(true);
    await loadUsers(verifiedPin);
  };

  const loadUsers = async (userPin: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/users/details", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Admin-Pin": userPin,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to load users");
      }

      const data = await res.json();
      setUsers(data.users || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load user details",
      });
      setPinVerified(false);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (pin) {
      loadUsers(pin);
    }
  };

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
            <h1 className="text-3xl font-bold">User Details</h1>
            <p className="text-muted-foreground">
              View detailed user information (PIN protected)
            </p>
          </div>
        </div>

        {!pinVerified ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                PIN Required
              </CardTitle>
              <CardDescription>
                Enter your admin PIN to view user details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowPinDialog(true)}>
                <Eye className="w-4 h-4 mr-2" />
                Enter PIN to View Users
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>
                    Complete user list with roles and PIN status
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>PIN Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        <div className="flex items-center justify-center py-8">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono">{user.id}</TableCell>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role === "admin" ? (
                              <Shield className="w-3 h-3 mr-1" />
                            ) : (
                              <UserCheck className="w-3 h-3 mr-1" />
                            )}
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.has_pin ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {user.pin_role} PIN
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                              No PIN
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <PinDialog
          open={showPinDialog}
          onOpenChange={setShowPinDialog}
          onSuccess={handlePinSuccess}
          title="Admin PIN Required"
          description="Enter your admin PIN to view user details"
          resource="users"
        />
      </div>
    </div>
  );
}
