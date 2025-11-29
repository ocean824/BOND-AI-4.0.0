import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Check, TrendingUp, Zap, Crown, ArrowLeft } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type MembershipTier = {
  id: string;
  name: string;
  priceId: string;
  price: number;
  tier: "standard" | "premium";
  features: string[];
  recommended?: boolean;
};

const membershipTiers: MembershipTier[] = [
  {
    id: "standard",
    name: "Standard",
    priceId: "", // Will be fetched from Stripe
    price: 199,
    tier: "standard",
    features: [
      "Access to Bond Exchange",
      "View all active auctions",
      "Place bids on perfected bonds",
      "Track your bid history",
      "Basic bond analytics",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    priceId: "", // Will be fetched from Stripe
    price: 299,
    tier: "premium",
    features: [
      "Everything in Standard",
      "Priority access to new listings",
      "Advanced bond analytics",
      "Exclusive premium auctions",
      "Dedicated support",
      "Early notification of opportunities",
    ],
    recommended: true,
  },
];

export default function InvestorMembershipPage() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleBack = async () => {
    await logout();
    setLocation("/login");
  };
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch Stripe prices
  const { data: pricesData, isLoading: loadingPrices } = useQuery({
    queryKey: ["/api/investor/membership/prices"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (tier: string) => {
      const response = await apiRequest("POST", "/api/investor/membership/checkout", { tier });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Checkout failed",
        description: error.message || "Could not start checkout process",
      });
      setIsProcessing(false);
    },
  });

  const handleSelectTier = async (tier: string) => {
    setSelectedTier(tier);
    setIsProcessing(true);
    checkoutMutation.mutate(tier);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Button>
        </div>
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Judgment Bond AI</h1>
              <p className="text-sm text-muted-foreground">Investor Exchange Portal</p>
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Choose Your Membership</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Select a membership tier to access the Bond Exchange. 
            Trade perfected judgment bonds in our exclusive investor marketplace.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {membershipTiers.map((tier) => (
            <Card 
              key={tier.id}
              className={`relative ${tier.recommended ? 'border-primary shadow-lg' : ''}`}
            >
              {tier.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Crown className="w-3 h-3 mr-1" />
                    Recommended
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  {tier.tier === "premium" ? (
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                      <TrendingUp className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription>
                  <span className="text-4xl font-bold text-foreground">${tier.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={tier.recommended ? "default" : "outline"}
                  size="lg"
                  disabled={isProcessing || loadingPrices}
                  onClick={() => handleSelectTier(tier.tier)}
                  data-testid={`button-select-${tier.tier}`}
                >
                  {isProcessing && selectedTier === tier.tier ? (
                    "Processing..."
                  ) : (
                    `Select ${tier.name}`
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-8">
          Secure payment powered by Stripe. Cancel anytime.
          <br />
          By subscribing, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}
