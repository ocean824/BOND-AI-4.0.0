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
  const [selectedMethod, setSelectedMethod] = useState<"jace" | "stripe">("jace");

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
        <RadioGroup value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as "jace" | "stripe")}>
          {/* JACE Payment - PRIMARY */}
          <div className="relative">
            <div className={`flex items-start space-x-4 rounded-lg border-2 p-4 transition-all ${
              selectedMethod === "jace" 
                ? "border-primary bg-primary/5" 
                : "border-muted hover:border-muted-foreground/50"
            }`}>
              <RadioGroupItem value="jace" id="jace" className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="jace" className="text-base font-semibold cursor-pointer">
                    JACE Payment
                  </Label>
                  <Badge variant="default" className="bg-green-600">Recommended</Badge>
                  <Badge variant="outline">Primary</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Fast, secure payment processing with instant settlement. Preferred method for bond purchases.
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>Instant confirmation</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>Lower fees</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>KYC integrated</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stripe Payment - FALLBACK */}
          <div className="relative">
            <div className={`flex items-start space-x-4 rounded-lg border-2 p-4 transition-all ${
              selectedMethod === "stripe" 
                ? "border-primary bg-primary/5" 
                : "border-muted hover:border-muted-foreground/50"
            }`}>
              <RadioGroupItem value="stripe" id="stripe" className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="stripe" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Credit/Debit Card (Stripe)
                  </Label>
                  <Badge variant="secondary">Alternative</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Traditional card payment through Stripe. Available as a backup option.
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-blue-600" />
                    <span>All major cards</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-blue-600" />
                    <span>Secure</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RadioGroup>

        <div className="flex gap-3">
          <Button 
            onClick={handleProceed}
            disabled={isLoading}
            className="flex-1"
            size="lg"
          >
            {isLoading ? "Processing..." : `Proceed with ${selectedMethod === "jace" ? "JACE" : "Stripe"} Payment`}
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
