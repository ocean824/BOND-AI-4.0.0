import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trophy, Clock, CheckCircle, CreditCard, ArrowRight, ChevronLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface BidWon {
  id: number;
  auctionId: number;
  bondId: number;
  bondName: string;
  bidAmount: string;
  wonAt: string;
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED";
  tradeId: number | null;
  bondDetails: {
    faceValue: string;
    couponRate: string;
    maturityDate: string;
    issuer: string;
  };
}

export default function InvestorBidsWonPage() {
  const [bidsWon, setBidsWon] = useState<BidWon[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    loadBidsWon();
  }, []);

  const loadBidsWon = async () => {
    try {
      const data = await apiRequest("GET", "/api/investor/bids-won");
      setBidsWon(data.bidsWon || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load winning bids",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = (tradeId: number) => {
    setLocation(`/exchange/trade-payment?tradeId=${tradeId}`);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Payment Pending
          </Badge>
        );
      case "FAILED":
        return <Badge variant="destructive">Payment Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading winning bids...</p>
          </div>
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
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-600" />
          Bids Won
        </h1>
        <p className="text-muted-foreground mt-2">
          Congratulations! Here are the auctions you've won
        </p>
      </div>

      {bidsWon.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Winning Bids Yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Keep bidding on auctions! Your winning bids will appear here.
            </p>
            <Button onClick={() => setLocation("/exchange/auctions")}>
              Browse Auctions
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {bidsWon.map((bid) => (
            <Card key={bid.id} className="border-l-4 border-l-yellow-600">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-600" />
                      {bid.bondName}
                    </CardTitle>
                    <CardDescription>
                      Won on {new Date(bid.wonAt).toLocaleDateString()} at{" "}
                      {new Date(bid.wonAt).toLocaleTimeString()}
                    </CardDescription>
                  </div>
                  {getPaymentStatusBadge(bid.paymentStatus)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Winning Bid</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${Number(bid.bidAmount).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Face Value</div>
                    <div className="text-lg font-semibold">
                      ${Number(bid.bondDetails.faceValue).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Coupon Rate</div>
                    <div className="text-lg font-semibold">
                      {Number(bid.bondDetails.couponRate).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Maturity</div>
                    <div className="text-sm">
                      {new Date(bid.bondDetails.maturityDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Issuer</div>
                    <div className="font-medium">{bid.bondDetails.issuer}</div>
                  </div>

                  {bid.paymentStatus === "PENDING" && bid.tradeId && (
                    <Button
                      onClick={() => handlePayment(bid.tradeId!)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Complete Payment
                    </Button>
                  )}

                  {bid.paymentStatus === "COMPLETED" && (
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/exchange/holdings")}
                    >
                      View in Holdings
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>

                {bid.paymentStatus === "PENDING" && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-yellow-900">Payment Required</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          Complete your payment to finalize this purchase. Click "Complete Payment" to proceed with JACE checkout.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {bid.paymentStatus === "COMPLETED" && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-green-900">Payment Completed</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Your payment has been processed successfully. This bond is now in your holdings.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold">What Happens Next?</h4>
              <p className="text-sm text-muted-foreground">
                After winning an auction, you'll need to complete payment within the specified timeframe. Once payment is confirmed, the bond will be transferred to your holdings and you'll receive all relevant documents.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
