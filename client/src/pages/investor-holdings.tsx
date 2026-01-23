// client/src/pages/investor-holdings.tsx
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Download, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Building,
  Shield,
  ChevronRight
} from "lucide-react";

interface BondHolding {
  id: number;
  bondId: number;
  bondName: string;
  cusip: string | null;
  isin: string | null;
  faceValue: string;
  currency: string;
  couponRate: string | null;
  maturityDate: string | null;
  purchasePrice: string;
  purchaseDate: string;
  currentValue: string;
  gainLoss: string;
  gainLossPercent: string;
  status: string;
  documents: Array<{
    id: number;
    filename: string;
    docType: string;
    createdAt: string;
  }>;
}

export default function InvestorHoldingsPage() {
  const [selectedHolding, setSelectedHolding] = useState<BondHolding | null>(null);

  // Fetch holdings
  const { data: holdings, isLoading } = useQuery<BondHolding[]>({
    queryKey: ["/api/investor/holdings"],
  });

  function formatCurrency(value: string, currency: string = "USD"): string {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(num);
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatPercent(value: string): string {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
  }

  async function handleDownloadDocument(holdingId: number, docId: number, filename: string) {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/investor/holdings/${holdingId}/documents/${docId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to download document");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download document");
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const totalValue = holdings?.reduce((sum, h) => sum + parseFloat(h.currentValue), 0) || 0;
  const totalGainLoss = holdings?.reduce((sum, h) => sum + parseFloat(h.gainLoss), 0) || 0;
  const avgGainLossPercent = holdings?.length 
    ? (holdings.reduce((sum, h) => sum + parseFloat(h.gainLossPercent), 0) / holdings.length)
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Holdings</h1>
          <p className="text-muted-foreground">
            View and manage your bond portfolio
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Portfolio
        </Button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue.toString())}</div>
            <p className="text-xs text-muted-foreground">
              {holdings?.length || 0} bond{holdings?.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(totalGainLoss.toString())}
            </div>
            <p className={`text-xs ${avgGainLossPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatPercent(avgGainLossPercent.toString())} average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bonds</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {holdings?.filter(h => h.status === "active").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {holdings?.filter(h => h.status === "matured").length || 0} matured
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Holdings List */}
      {!holdings || holdings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Holdings Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              You haven't purchased any bonds yet. Browse the exchange to find investment opportunities.
            </p>
            <Button onClick={() => window.location.href = "/exchange/auctions"}>
              Browse Exchange
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {holdings.map((holding) => (
            <Card key={holding.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{holding.bondName}</CardTitle>
                    <CardDescription>
                      {holding.cusip && `CUSIP: ${holding.cusip}`}
                      {holding.isin && ` • ISIN: ${holding.isin}`}
                    </CardDescription>
                  </div>
                  <Badge variant={holding.status === "active" ? "default" : "secondary"}>
                    {holding.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Value Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Face Value</p>
                    <p className="text-sm font-semibold">
                      {formatCurrency(holding.faceValue, holding.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current Value</p>
                    <p className="text-sm font-semibold">
                      {formatCurrency(holding.currentValue, holding.currency)}
                    </p>
                  </div>
                </div>

                {/* Performance */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Purchase Price</p>
                    <p className="text-sm font-semibold">
                      {formatCurrency(holding.purchasePrice, holding.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gain/Loss</p>
                    <p className={`text-sm font-semibold ${parseFloat(holding.gainLoss) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(holding.gainLoss, holding.currency)}
                      <span className="text-xs ml-1">
                        ({formatPercent(holding.gainLossPercent)})
                      </span>
                    </p>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Purchase Date
                    </p>
                    <p className="text-sm">{formatDate(holding.purchaseDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Maturity Date
                    </p>
                    <p className="text-sm">{formatDate(holding.maturityDate)}</p>
                  </div>
                </div>

                {/* Coupon Rate */}
                {holding.couponRate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Coupon Rate</p>
                    <p className="text-sm font-semibold">{holding.couponRate}%</p>
                  </div>
                )}

                {/* Documents */}
                {holding.documents && holding.documents.length > 0 && (
                  <div className="pt-4 border-t space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Documents</p>
                    {holding.documents.map((doc) => (
                      <Button
                        key={doc.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleDownloadDocument(holding.id, doc.id, doc.filename)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        <span className="truncate flex-1 text-left">{doc.filename}</span>
                        <Download className="ml-2 h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                )}

                {/* View Details Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectedHolding(holding)}
                >
                  View Details
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
