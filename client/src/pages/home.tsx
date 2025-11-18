import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Package, TrendingUp, DollarSign } from "lucide-react";
import type { InvestorMetrics } from "@shared/schema";

export default function HomePage() {
  const { data: metrics, isLoading } = useQuery<InvestorMetrics>({
    queryKey: ["/api/metrics"],
  });

  const statCards = [
    {
      title: "Total Judgments",
      value: metrics?.totalJudgments || 0,
      icon: FileText,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100 dark:bg-blue-900/20",
      testId: "metric-total-judgments",
    },
    {
      title: "Total Face Value",
      value: `$${(metrics?.totalFaceValue || 0).toLocaleString()}`,
      icon: DollarSign,
      iconColor: "text-green-600",
      iconBg: "bg-green-100 dark:bg-green-900/20",
      testId: "metric-total-face-value",
    },
    {
      title: "Recommended Purchase",
      value: `$${(metrics?.totalRecommendedPurchase || 0).toLocaleString()}`,
      icon: TrendingUp,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-100 dark:bg-purple-900/20",
      testId: "metric-recommended-purchase",
    },
    {
      title: "Average Recovery",
      value: `${(metrics?.averageRecovery || 0).toFixed(1)}%`,
      icon: Package,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-100 dark:bg-amber-900/20",
      testId: "metric-average-recovery",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          AI-powered judgment analysis and bond portfolio management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <div className="text-2xl font-bold font-mono" data-testid={stat.testId}>
                  {stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Quick actions to begin analyzing judgments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                1
              </div>
              <div>
                <p className="font-medium">Upload Judgments</p>
                <p className="text-sm text-muted-foreground">
                  Upload PDF judgment documents for AI-powered data extraction
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                2
              </div>
              <div>
                <p className="font-medium">Calculate Pricing</p>
                <p className="text-sm text-muted-foreground">
                  Generate base, optimistic, and stressed pricing scenarios
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                3
              </div>
              <div>
                <p className="font-medium">Build Bundles</p>
                <p className="text-sm text-muted-foreground">
                  Create investment bundles with senior, mezzanine, and equity tranches
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Features</CardTitle>
            <CardDescription>Comprehensive AI-powered underwriting tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <p className="text-sm">AI extraction using GPT-5 with dual-model validation</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <p className="text-sm">Multi-scenario pricing (base, optimistic, stressed)</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <p className="text-sm">Tranche-based portfolio construction</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <p className="text-sm">Investor analytics with detailed metrics</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <p className="text-sm">Professional teaser PDF generation</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <p className="text-sm">AI chat assistant for platform guidance</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            <strong className="font-semibold text-foreground">Important Disclaimer:</strong> This
            platform provides AI-powered analysis for informational purposes only. All judgment
            valuations, pricing scenarios, and recovery estimates are algorithmic predictions and
            should not be considered legal or investment advice. Please consult with qualified
            legal and financial professionals before making any investment decisions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
