import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Shield, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

export default function CheckoutSuccessPage() {
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();
  const [countdown, setCountdown] = useState(5);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;
    
    const verifySubscription = async () => {
      attempts++;
      try {
        await refreshUser();
        const updatedUser = await refreshUser();
        
        if (updatedUser?.subscriptionStatus === 'active') {
          setIsVerifying(false);
          queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
          return true;
        }
        
        if (attempts >= maxAttempts) {
          setIsVerifying(false);
          return false;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        return verifySubscription();
      } catch (error) {
        console.error('Error verifying subscription:', error);
        if (attempts >= maxAttempts) {
          setIsVerifying(false);
        }
        return false;
      }
    };

    verifySubscription();
  }, [refreshUser]);

  useEffect(() => {
    if (isVerifying) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setLocation("/exchange/overview");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setLocation, isVerifying]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
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

        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              {isVerifying ? (
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl">
              {isVerifying ? "Activating Your Membership..." : "Welcome to the Exchange!"}
            </CardTitle>
            <CardDescription>
              {isVerifying 
                ? "Please wait while we confirm your payment and activate your subscription."
                : "Your membership is now active. You have full access to the Bond Exchange."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isVerifying && (
              <>
                <p className="text-sm text-muted-foreground">
                  Redirecting to the Bond Exchange in {countdown} seconds...
                </p>
                <Button
                  className="w-full"
                  onClick={() => setLocation("/exchange/overview")}
                  data-testid="button-go-to-exchange"
                >
                  Go to Exchange Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
