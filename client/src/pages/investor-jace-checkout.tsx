import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type TradeDto = {
  id: number;
  bondId: number;
  auctionId: number;
  investorId: number;
  amount: string;
  status: string;
  settlementId: string | null;
  createdAt: string;
  onboardingStatus?: string;
  onboardingCompletedAt?: string | null;
  jaceSessionId?: string | null;
  jaceSessionStatus?: string;
  jacePaidAt?: string | null;
};

export default function InvestorJaceCheckoutPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const tradeId = Number(params.get("tradeId") || params.get("trade_id") || "0");

  const [loading, setLoading] = useState(true);
  const [trade, setTrade] = useState<TradeDto | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(params.get("sessionId") || params.get("session_id"));
  const [paying, setPaying] = useState(false);

  // Fake fields for a realistic checkout form (no real payment processing)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [exp, setExp] = useState("12/34");
  const [cvc, setCvc] = useState("123");

  async function fetchTrade() {
    if (!tradeId) return;
    const res = await fetch(`/api/investor/trades/${tradeId}`, { credentials: "include" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Failed to load trade");
    }
    const data = await res.json();
    return data.trade as TradeDto;
  }

  async function ensureSession() {
    const res = await fetch(`/api/investor/trades/${tradeId}/jace/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ mode: "MOCK" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || "Failed to create checkout session");
    }
    return data as { sessionId: string; checkoutUrl: string };
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!tradeId) {
          toast({ title: "Missing trade", description: "No tradeId provided.", variant: "destructive" });
          setLocation("/exchange");
          return;
        }

        setLoading(true);
        const t = await fetchTrade();
        if (cancelled) return;
        setTrade(t || null);

        // If onboarding isn't complete, redirect to onboarding page (Option B enforcement)
        if (t && t.onboardingStatus !== "COMPLETED") {
          setLoading(false);
          return;
        }

        // Create / reuse a mock JACE checkout session
        if (!sessionId) {
          const sess = await ensureSession();
          if (cancelled) return;
          setSessionId(sess.sessionId);
          // Keep URL in sync for shareable testing
          const next = `/exchange/jace-checkout?tradeId=${tradeId}&sessionId=${encodeURIComponent(sess.sessionId)}`;
          window.history.replaceState({}, "", next);
        }

        setLoading(false);
      } catch (e: any) {
        console.error(e);
        toast({ title: "Checkout error", description: e?.message || "Something went wrong", variant: "destructive" });
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId]);

  async function handlePayMock() {
    if (!sessionId) {
      toast({ title: "Missing session", description: "No checkout session was created.", variant: "destructive" });
      return;
    }
    try {
      setPaying(true);
      const res = await fetch("/api/investor/jace/mock/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tradeId, sessionId, fullName, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Mock payment failed");

      toast({ title: "Payment confirmed (Mock)", description: "Simulated webhook received and processed." });

      const t = await fetchTrade();
      setTrade(t || null);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Payment error", description: e?.message || "Something went wrong", variant: "destructive" });
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>JACE Checkout (Mock)</CardTitle>
          </CardHeader>
          <CardContent>Loading…</CardContent>
        </Card>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>JACE Checkout (Mock)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Trade not found.</p>
            <div className="mt-4">
              <Button onClick={() => setLocation("/exchange")}>Back to Exchange</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (trade.onboardingStatus !== "COMPLETED") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>JACE Checkout (Mock)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Option B is enforced: you must complete onboarding before a payment session can be created.
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => setLocation(`/exchange/jace-onboarding?tradeId=${tradeId}`)}>Go to Onboarding</Button>
              <Button variant="outline" onClick={() => setLocation("/exchange")}>Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSettled = trade.status === "SETTLED" || trade.settlementId;

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>JACE Checkout (Mock)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            This is a fully in-app mock checkout page so you can test the end-to-end flow without the JACE API.
            Clicking <span className="font-semibold">Confirm &amp; Pay (Mock)</span> triggers a simulated JACE webhook
            ({"trade.paid"}) and drives the trade into the closeout state.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trade Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Trade ID</span>
              <span className="font-mono">{trade.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">${trade.amount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="font-semibold">{trade.status}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Session</span>
              <span className="font-mono">{sessionId || trade.jaceSessionId || "—"}</span>
            </div>
            {trade.jacePaidAt ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span>{new Date(trade.jacePaidAt).toLocaleString()}</span>
              </div>
            ) : null}
            {trade.settlementId ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Settlement</span>
                <span className="font-mono">{trade.settlementId}</span>
              </div>
            ) : null}

            <div className="pt-4 flex gap-2">
              <Button variant="outline" onClick={() => setLocation(`/exchange/demo?mode=closing&tradeId=${trade.id}`)}>
                View Closing Demo
              </Button>
              <Button variant="outline" onClick={() => setLocation("/exchange/my-bids")}>
                View My Trades
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="card">Card Number (Mock)</Label>
              <Input id="card" value={card} onChange={(e) => setCard(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="exp">Expiry</Label>
                <Input id="exp" value={exp} onChange={(e) => setExp(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input id="cvc" value={cvc} onChange={(e) => setCvc(e.target.value)} />
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={handlePayMock} disabled={paying || isSettled} className="w-full">
                {isSettled ? "Trade Settled" : paying ? "Processing…" : "Confirm & Pay (Mock)"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                No funds are transferred. This is a test harness that simulates the JACE webhook and drives your in-app
                closeout state.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isSettled ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Closeout State</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Payment is confirmed and the trade is settled. This is now a real in-app closeout state tied to the trade
              record.
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => setLocation(`/exchange/my-bids`)}>Go to Trades</Button>
              <Button variant="outline" onClick={() => setLocation(`/exchange/demo?mode=closing&tradeId=${trade.id}`)}>
                Replay Closing Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
