import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronLeft, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  TrendingUp,
  Users,
  FileText,
  Clock,
  AlertCircle,
  BarChart3,
  Brain
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  resource: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

interface ComplianceMetrics {
  score: number;
  totalEvents: number;
  criticalEvents: number;
  warningEvents: number;
  successRate: number;
  averageResponseTime: number;
}

interface AIInsight {
  type: "anomaly" | "trend" | "recommendation";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  timestamp: string;
}

export default function AdminAuditPage() {
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState("7d");

  // Fetch audit logs
  const { data: auditLogs, isLoading: logsLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit/logs", timeRange],
  });

  // Fetch compliance metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<ComplianceMetrics>({
    queryKey: ["/api/admin/audit/metrics", timeRange],
  });

  // Fetch AI insights
  const { data: insights, isLoading: insightsLoading } = useQuery<AIInsight[]>({
    queryKey: ["/api/admin/audit/ai-insights", timeRange],
  });

  // Mock data for demo (remove when API is ready)
  const mockMetrics: ComplianceMetrics = metrics || {
    score: 94,
    totalEvents: 1247,
    criticalEvents: 3,
    warningEvents: 18,
    successRate: 98.2,
    averageResponseTime: 245,
  };

  const mockInsights: AIInsight[] = insights || [
    {
      type: "anomaly",
      severity: "high",
      title: "Unusual Login Pattern Detected",
      description: "Multiple failed login attempts from IP 192.168.1.100 detected in the last hour. Potential brute force attack.",
      timestamp: new Date().toISOString(),
    },
    {
      type: "trend",
      severity: "medium",
      title: "Increased API Usage",
      description: "API calls have increased by 45% compared to last week. Consider scaling infrastructure.",
      timestamp: new Date().toISOString(),
    },
    {
      type: "recommendation",
      severity: "low",
      title: "Enable 2FA for All Admins",
      description: "2 admin accounts do not have 2FA enabled. Recommend enabling for enhanced security.",
      timestamp: new Date().toISOString(),
    },
  ];

  const mockLogs: AuditLog[] = auditLogs || [
    {
      id: 1,
      userId: 1,
      action: "USER_LOGIN",
      resource: "auth",
      details: { success: true },
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      userId: 1,
      action: "JUDGMENT_CREATED",
      resource: "judgments",
      details: { judgmentId: 123 },
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      createdAt: new Date().toISOString(),
    },
  ];

  const getComplianceColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getComplianceBg = (score: number) => {
    if (score >= 90) return "bg-green-100 dark:bg-green-900/20";
    if (score >= 70) return "bg-yellow-100 dark:bg-yellow-900/20";
    return "bg-red-100 dark:bg-red-900/20";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case "anomaly": return AlertTriangle;
      case "trend": return TrendingUp;
      case "recommendation": return CheckCircle;
      default: return AlertCircle;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Back Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/admin/panel")}
          className="gap-1 pl-0 hover:pl-1 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Admin Panel
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Audit & Compliance Dashboard</h1>
          <p className="text-muted-foreground">
            AI-powered monitoring, analytics, and compliance reporting
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <Badge variant="secondary" className="gap-2">
            <Brain className="w-3 h-3" />
            AI-Powered
          </Badge>
        </div>
      </div>

      {/* Compliance Score Card */}
      <Card className={`border-l-4 border-l-green-500 ${getComplianceBg(mockMetrics.score)}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Compliance Score</CardTitle>
              <CardDescription>Overall system health and compliance rating</CardDescription>
            </div>
            <div className={`text-6xl font-bold ${getComplianceColor(mockMetrics.score)}`}>
              {mockMetrics.score}%
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{mockMetrics.totalEvents.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{mockMetrics.criticalEvents}</div>
              <div className="text-xs text-muted-foreground">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{mockMetrics.warningEvents}</div>
              <div className="text-xs text-muted-foreground">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{mockMetrics.successRate}%</div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5" />
          AI-Powered Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insightsLoading ? (
            <>
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </>
          ) : (
            mockInsights.map((insight, index) => {
              const Icon = getSeverityIcon(insight.type);
              return (
                <Card key={index} className="hover-elevate transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        <CardTitle className="text-base">{insight.title}</CardTitle>
                      </div>
                      <Badge variant={getSeverityColor(insight.severity) as any}>
                        {insight.severity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(insight.timestamp).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.totalEvents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12.5% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{mockMetrics.criticalEvents}</div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mockMetrics.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              Above target threshold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.averageResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              -15ms from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>Detailed system activity and event tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Events</TabsTrigger>
              <TabsTrigger value="critical">Critical</TabsTrigger>
              <TabsTrigger value="auth">Authentication</TabsTrigger>
              <TabsTrigger value="data">Data Changes</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-4">
              {logsLoading ? (
                <>
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </>
              ) : (
                <div className="space-y-2">
                  {mockLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div>
                          <div className="font-medium">{log.action}</div>
                          <div className="text-sm text-muted-foreground">
                            {log.resource} • User ID: {log.userId} • IP: {log.ipAddress}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="critical">
              <div className="text-center py-8 text-muted-foreground">
                No critical events in the selected time range
              </div>
            </TabsContent>

            <TabsContent value="auth">
              <div className="text-center py-8 text-muted-foreground">
                Authentication events will appear here
              </div>
            </TabsContent>

            <TabsContent value="data">
              <div className="text-center py-8 text-muted-foreground">
                Data change events will appear here
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Export & Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleString()}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
