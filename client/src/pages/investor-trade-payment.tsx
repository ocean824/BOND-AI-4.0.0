import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PaymentMethodSelector } from "@/components/payment-method-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function InvestorTradePaymentPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const params = new URLSearchParams(searchString);
  const tradeId = params.get("tradeId");

  // Fetch trade details
  const { data: trade, isLoading, error } = useQuery({
    queryKey: [`/api/investor/trades/${tradeId}`],
    queryFn: async () => {
      if (!tradeId) throw new Error("No trade ID provided");
      const res = await apiRequest(`/api/investor/trades/${tradeId}`, "GET");
      if (!res.ok) throw new Error("Failed to fetch trade");
      const data = await res.json();
      return data.trade;
    },
    enabled: !!tradeId,
  });

  const handlePaymentMethodSelected = async (method: "jace" | "stripe") => {
    if (!tradeId) return;
    
    setIsProcessing(true);
    
    try {
      if (method === "jace") {
        // JACE is PRIMARY - redirect to onboarding first
        setLocation(`/exchange/jace-onboarding?tradeId=${tradeId}`);
      } else {
        // Stripe is FALLBACK - create Stripe checkout session
        const res = await apiRequest(`/api/investor/trades/${tradeId}/checkout`, "POST");
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to create checkout session");
        }
        
        const data = await res.json();
        
        // Redirect to Stripe checkout
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          throw new Error("No checkout URL returned");
        }
      }
    } catch (error: any) {
      console.error("Payment initiation error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (!tradeId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p>No trade ID provided</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/exchange/auctions")}
              className="mt-4"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Auctions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p>Failed to load trade details</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/exchange/auctions")}
              className="mt-4"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Auctions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (trade.status !== "PENDING") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <p>This trade is not pending payment</p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Current status: <Badge>{trade.status}</Badge>
            </p>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/exchange/my-bids")}
              className="mt-4"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              View My Bids
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/exchange/my-bids")}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to My Bids
        </Button>
        <h1 className="text-3xl font-bold">Complete Your Purchase</h1>
        <p className="text-muted-foreground mt-2">
          You won the auction! Select your payment method to complete the purchase.
        </p>
      </div>

      <PaymentMethodSelector
        tradeId={parseInt(tradeId)}
        amount={trade.amount}
        onPaymentMethodSelected={handlePaymentMethodSelected}
        isLoading={isProcessing}
      />
    </div>
  );
}
