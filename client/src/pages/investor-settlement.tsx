import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, AlertCircle, Download, FileText, ChevronLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Settlement {
  id: number;
  tradeId: number;
  bondName: string;
  bondId: number;
  amount: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  paymentMethod: string;
  settledAt: string | null;
  createdAt: string;
  documents: {
    id: number;
    name: string;
    type: string;
  }[];
}

export default function InvestorSettlementPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    loadSettlements();
  }, []);

  const loadSettlements = async () => {
    try {
      const data = await apiRequest("GET", "/api/investor/settlements");
      setSettlements(data.settlements || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load settlements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (documentId: number, documentName: string) => {
    try {
      const response = await fetch(`/api/investor/documents/${documentId}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = documentName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Document downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "PENDING":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "FAILED":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading settlements...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Navigation */}
      <Button
        variant="ghost"
        onClick={() => setLocation("/exchange/overview")}
        className="mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Exchange Overview
      </Button>

      <div>
        <h1 className="text-3xl font-bold">Settlement History</h1>
        <p className="text-muted-foreground mt-2">
          View your payment settlements and transaction history
        </p>
      </div>

      {settlements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Settlements Yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Your settlement history will appear here once you complete bond purchases.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {settlements.map((settlement) => (
            <Card key={settlement.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(settlement.status)}
                      {settlement.bondName}
                    </CardTitle>
                    <CardDescription>
                      Settlement ID: {settlement.id} | Trade ID: {settlement.tradeId}
                    </CardDescription>
                  </div>
                  {getStatusBadge(settlement.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Amount</div>
                    <div className="text-lg font-semibold">
                      ${Number(settlement.amount).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Payment Method</div>
                    <div className="text-lg font-semibold capitalize">
                      {settlement.paymentMethod}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Created</div>
                    <div className="text-sm">
                      {new Date(settlement.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Settled</div>
                    <div className="text-sm">
                      {settlement.settledAt
                        ? new Date(settlement.settledAt).toLocaleDateString()
                        : "Pending"}
                    </div>
                  </div>
                </div>

                {settlement.documents && settlement.documents.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Settlement Documents</h4>
                      <div className="grid gap-2">
                        {settlement.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{doc.name}</div>
                                <div className="text-xs text-muted-foreground">{doc.type}</div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadDocument(doc.id, doc.name)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
