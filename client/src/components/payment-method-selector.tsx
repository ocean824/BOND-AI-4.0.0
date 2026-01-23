import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Wallet, CheckCircle } from "lucide-react";

interface PaymentMethodSelectorProps {
  tradeId: number;
  amount: string;
  onPaymentMethodSelected: (method: "jace" | "stripe") => void;
  isLoading?: boolean;
}

export function PaymentMethodSelector({ 
  tradeId, 
  amount, 
  onPaymentMethodSelected,
  isLoading = false 
}: PaymentMethodSelectorProps) {
  // Only Jace is shown to users, Stripe kept as backend fallback
  const selectedMethod = "jace";

  const handleProceed = () => {
    onPaymentMethodSelected(selectedMethod);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Select Payment Method
        </CardTitle>
        <CardDescription>
          Choose how you'd like to complete your bond purchase of ${amount}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Only show Jace payment option - Stripe kept as backend fallback */}
        {/* JACE Payment - Only visible option */}
        <div className="rounded-lg border-2 border-primary bg-primary/5 p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">JACE Payment</h3>
                <p className="text-sm text-muted-foreground">
                  Fast, secure payment processing with instant settlement
                </p>
              </div>
              <Badge variant="default" className="bg-green-600">Secure</Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-muted-foreground">Instant confirmation</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-muted-foreground">Lower fees</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-muted-foreground">KYC integrated</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={handleProceed}
            disabled={isLoading}
            className="flex-1"
            size="lg"
          >
            {isLoading ? "Processing..." : "Proceed with JACE Payment"}
          </Button>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground">
          <p className="font-semibold mb-1">🔒 Secure Payment</p>
          <p>
            All payments are processed through secure, encrypted channels. Your payment information is never stored on our servers.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
