import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ExternalLink, Lock, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type OnboardingForm = {
  legalName: string;
  email: string;
  phone: string;
  entityName: string;
  entityType: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export default function InvestorJaceOnboardingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const search = new URLSearchParams(window.location.search);
  const tradeIdParam = search.get("tradeId");
  const tradeId = tradeIdParam ? Number(tradeIdParam) : undefined;


  const initial = useMemo<OnboardingForm>(() => ({
    legalName: user?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    entityName: "",
    entityType: "Individual",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  }), [user?.email, user?.name]);

  const [form, setForm] = useState<OnboardingForm>(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ correlationId: string; deliveryStatus: string } | null>(null);

  const onChange = (k: keyof OnboardingForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [k]: e.target.value }));
  };

  const submit = async () => {
    setIsSubmitting(true);
    try {
      const payload = tradeId ? { ...form, tradeId } : form;
      const res = await apiRequest("POST", "/api/investor/jace/onboarding", payload);
      const data = await res.json();
      setSubmitted({ correlationId: data.correlationId, deliveryStatus: data.delivery?.status ?? "SENT" });
      toast({ title: "Submitted to JACE", description: "Your onboarding record was sent to JACE and logged for audit." });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: err?.message || "Could not send your onboarding to JACE. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">JACE Investor Onboarding</h1>
            <p className="text-sm text-muted-foreground">Secure onboarding + bid payment processing (off‑platform)</p>
          </div>
          <Badge variant="secondary" className="gap-2">
            <Lock className="w-3 h-3" />
            External Processing
          </Badge>
        </div>

        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Important: BondAI does not process bid payments</AlertTitle>
          <AlertDescription>
            All investor onboarding, bid payment confirmation, and payment processing for bond purchases is handled by <b>JACE</b>.
            BondAI only records the resulting status updates for audit, reporting, and investor account history.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Investor Information</CardTitle>
            <CardDescription>
              Enter the details JACE requires. This will be exported to JACE CRM and also recorded in BondAI’s immutable audit log.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Legal name</Label>
                <Input value={form.legalName} onChange={onChange("legalName")} placeholder="Full legal name" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={onChange("email")} placeholder="name@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={onChange("phone")} placeholder="(555) 555-5555" />
              </div>
              <div className="space-y-2">
                <Label>Entity type</Label>
                <Input value={form.entityType} onChange={onChange("entityType")} placeholder="Individual / LLC / Trust / Fund" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Entity name (if applicable)</Label>
                <Input value={form.entityName} onChange={onChange("entityName")} placeholder="Optional (e.g., My Fund LLC)" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Address line 1</Label>
                <Input value={form.addressLine1} onChange={onChange("addressLine1")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address line 2</Label>
                <Input value={form.addressLine2} onChange={onChange("addressLine2")} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city} onChange={onChange("city")} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={form.state} onChange={onChange("state")} />
              </div>
              <div className="space-y-2">
                <Label>Postal code</Label>
                <Input value={form.postalCode} onChange={onChange("postalCode")} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={form.country} onChange={onChange("country")} />
              </div>
            </div>

            {submitted ? (
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <CheckCircle className="w-4 h-4" />
                  Submitted
                </div>
                <p className="text-xs text-muted-foreground">
                  Correlation ID: <span className="font-mono">{submitted.correlationId}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  JACE delivery status: <span className="font-mono">{submitted.deliveryStatus}</span>
                </p>
              </div>
            ) : null}

            <div className="flex flex-col md:flex-row gap-3 justify-between">
              <Button variant="outline" onClick={() => setLocation("/exchange/demo")}>Back to Demo</Button>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setLocation("/exchange/auctions")}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Go to Exchange
                </Button>
                <Button
                  onClick={submitted ? () => setLocation(tradeId ? `/exchange/jace-checkout?tradeId=${tradeId}` : "/exchange/demo?mode=closing") : submit}
                  disabled={isSubmitting}
                >
                  {submitted ? (tradeId ? "Next: JACE Checkout (Mock)" : "Next: Settlement Walkthrough") : (isSubmitting ? "Submitting…" : "Submit to JACE")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
