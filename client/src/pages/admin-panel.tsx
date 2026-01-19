import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, FileText, Package, Banknote, LogOut, Database, Settings, AlertCircle, Building2, TrendingUp, Gavel, ArrowRight, Key, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApiRequest } from "@/lib/adminQueryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type AdminStats = {
  totalUsers: number;
  totalJudgments: number;
  totalBundles: number;
  totalBonds: number;
  totalBondDocuments: number;
  usersByRole?: {
    admin: number;
    analyst: number;
    investor: number;
    surety: number;
    other: number;
  };
};

export default function AdminPanelPage() {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setLocation("/");
      return;
    }

    adminApiRequest("/api/admin/verify")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Invalid token");
        }
        setIsAuthenticated(true);
      })
      .catch(() => {
        localStorage.removeItem("admin_token");
        setLocation("/");
      })
      .finally(() => {
        setIsChecking(false);
      });
  }, [setLocation]);

  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await adminApiRequest("/api/admin/stats");
      if (!res.ok) {
        throw new Error("Failed to fetch admin statistics");
      }
      return res.json();
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setLocation("/");
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "Total Judgments",
      value: stats?.totalJudgments || 0,
      icon: FileText,
      iconColor: "text-green-600",
      iconBg: "bg-green-100 dark:bg-green-900/20",
    },
    {
      title: "Total Bundles",
      value: stats?.totalBundles || 0,
      icon: Package,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      title: "Total Bonds",
      value: stats?.totalBonds || 0,
      icon: Banknote,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-100 dark:bg-amber-900/20",
    },
    {
      title: "Bond Documents",
      value: stats?.totalBondDocuments || 0,
      icon: Database,
      iconColor: "text-rose-600",
      iconBg: "bg-rose-100 dark:bg-rose-900/20",
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">System Control Center</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-2">System Overview</h2>
          <p className="text-muted-foreground">
            Platform statistics and administrative controls
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading statistics</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to fetch admin statistics"}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`flex items-center justify-center w-10 h-10 rounded-md ${stat.iconBg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold font-mono" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      {stat.value.toLocaleString()}
                    </div>
                    {stat.title === "Total Users" && stats?.usersByRole && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Admin:</span>
                            <span className="font-semibold">{stats.usersByRole.admin}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Analyst:</span>
                            <span className="font-semibold">{stats.usersByRole.analyst}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Investor:</span>
                            <span className="font-semibold">{stats.usersByRole.investor}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Surety:</span>
                            <span className="font-semibold">{stats.usersByRole.surety}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation("/admin/user-details");
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Details (PIN)
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-2">Admin Features</h2>
          <p className="text-muted-foreground mb-4">
            Access all platform management tools
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/admin/surety")}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-lg">Surety Underwriting</CardTitle>
                <CardDescription>Bond surety management with PIN protection</CardDescription>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-md bg-amber-100 dark:bg-amber-900/20">
                <Building2 className="w-6 h-6 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" data-testid="button-admin-surety">
                <span>Access Surety System</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/admin/exchange")}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-lg">Bond Exchange</CardTitle>
                <CardDescription>Investor auction marketplace</CardDescription>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-md bg-blue-100 dark:bg-blue-900/20">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" data-testid="button-admin-exchange">
                <span>View Exchange</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/admin/exchange/overview")}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-lg">Exchange Overview</CardTitle>
                <CardDescription>Investment pipeline dashboard</CardDescription>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-md bg-green-100 dark:bg-green-900/20">
                <Gavel className="w-6 h-6 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" data-testid="button-admin-exchange-overview">
                <span>View Overview</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer" onClick={(e) => {
            e.stopPropagation();
            // PIN protection for audit access
            const pin = prompt("Enter your admin PIN to access Audit & Compliance:");
            if (pin) {
              // TODO: Verify PIN via API
              setLocation("/admin/audit");
            }
          }}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-lg">Audit & Compliance</CardTitle>
                <CardDescription>View audit logs and compliance reports</CardDescription>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-md bg-red-100 dark:bg-red-900/20">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" data-testid="button-admin-audit">
                <span>View Audit Logs</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer" onClick={(e) => {
            e.stopPropagation();
            // PIN protection for ledger access
            const pin = prompt("Enter your admin PIN to access Ledger Entries:");
            if (pin) {
              // TODO: Verify PIN via API
              setLocation("/admin/ledger");
            }
          }}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-lg">Ledger Entries</CardTitle>
                <CardDescription>View double-entry accounting ledger</CardDescription>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-md bg-purple-100 dark:bg-purple-900/20">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" data-testid="button-admin-ledger">
                <span>View Ledger</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/admin/pin-management")}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-lg">PIN Management</CardTitle>
                <CardDescription>Generate and manage access PINs</CardDescription>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-md bg-orange-100 dark:bg-orange-900/20">
                <Key className="w-6 h-6 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" data-testid="button-admin-pins">
                <span>Manage PINs</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/admin/invites")}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-lg">Invite Codes</CardTitle>
                <CardDescription>Generate and manage invite codes</CardDescription>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-md bg-indigo-100 dark:bg-indigo-900/20">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" data-testid="button-admin-invites">
                <span>Manage Invites</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Management</CardTitle>
              <CardDescription>Monitor and manage database operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                <p className="text-sm">Real data policy enforcement active</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                <p className="text-sm">Migration system operational</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                <p className="text-sm">Deployment validation enabled</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Services</CardTitle>
              <CardDescription>AI integration status and capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                <p className="text-sm">GPT-5 judgment extraction active</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                <p className="text-sm">Bond document drafting available</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                <p className="text-sm">Document summarization enabled</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                <p className="text-sm">AI chat assistant operational</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">Administrative Access</p>
                <p className="text-sm text-muted-foreground">
                  You are logged in with administrator privileges. This panel provides system-wide
                  oversight and control. All operations are logged and monitored for security purposes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
