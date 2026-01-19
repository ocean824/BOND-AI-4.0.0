import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AIChatAssistant } from "@/components/ai-chat-assistant";
import HomePage from "@/pages/home";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import JudgmentsPage from "@/pages/judgments";
import BundlesPage from "@/pages/bundles";
import BondsPage from "@/pages/bonds";
import InvestorDashboardPage from "@/pages/investor-dashboard";
import UnderwritingPage from "@/pages/underwriting";
import InvestorOverviewPage from "@/pages/investor-overview";
import InvestorExchangePage from "@/pages/investor-exchange";
import InvestorMyBidsPage from "@/pages/investor-my-bids";
import InvestorMembershipPage from "@/pages/investor-membership";
import CheckoutSuccessPage from "@/pages/checkout-success";
import AdminLoginPage from "@/pages/admin-login";
import AdminPanelPage from "@/pages/admin-panel";
import SuretyDashboardPage from "@/pages/surety-dashboard";
import AdminPinManagementPage from "@/pages/admin-pin-management";
import AdminInvitesPage from "@/pages/admin-invites";
import AdminLedgerPage from "@/pages/admin-ledger";
import AdminUserDetailsPage from "@/pages/admin-user-details";
import NotFound from "@/pages/not-found";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        <AIChatAssistant />
      </div>
    </SidebarProvider>
  );
}

function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const adminToken = localStorage.getItem("admin_token");
    if (!adminToken) {
      setLocation("/admin/login");
      return;
    }

    fetch("/api/admin/verify", {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        setIsVerified(true);
      })
      .catch(() => {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("auth_token");
        setLocation("/admin/login");
      })
      .finally(() => setIsChecking(false));
  }, [setLocation]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isVerified) return null;

  return <>{children}</>;
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Admin routes - accessible without regular user authentication
  if (location.startsWith("/admin")) {
    if (location === "/admin/login") {
      return <AdminLoginPage />;
    }
    
    return (
      <AdminAuthGuard>
        <Switch>
          <Route path="/admin/surety" component={SuretyDashboardPage} />
          <Route path="/admin/exchange" component={InvestorExchangePage} />
          <Route path="/admin/exchange/overview" component={InvestorOverviewPage} />
          <Route path="/admin/exchange/auctions" component={InvestorExchangePage} />
          <Route path="/admin/exchange/my-bids" component={InvestorMyBidsPage} />
          <Route path="/admin/pins" component={AdminPinManagementPage} />
          <Route path="/admin/invites" component={AdminInvitesPage} />
          <Route path="/admin/ledger" component={AdminLedgerPage} />
          <Route path="/admin/users/:id" component={AdminUserDetailsPage} />
          <Route path="/admin" component={AdminPanelPage} />
        </Switch>
      </AdminAuthGuard>
    );
  }

  // Force login page route - clears session and shows login
  if (location === "/login") {
    return <LoginPage />;
  }

  // Regular user routes
  if (!user) {
    return (
      <Switch>
        <Route path="/register" component={RegisterPage} />
        <Route path="/" component={LoginPage} />
        <Route component={LoginPage} />
      </Switch>
    );
  }

  // INVESTOR GATE: Investors can ONLY access Bond Exchange routes
  // Check if investor has active subscription
  if (user.role === "investor") {
    const hasActiveSubscription = user.subscriptionStatus === "active";
    
    // Allow checkout success page regardless of subscription
    if (location === "/checkout/success") {
      return (
        <Switch>
          <Route path="/checkout/success" component={CheckoutSuccessPage} />
        </Switch>
      );
    }
    
    // If no active subscription, redirect to membership page
    if (!hasActiveSubscription) {
      return (
        <Switch>
          <Route path="/membership" component={InvestorMembershipPage} />
          <Route component={InvestorMembershipPage} />
        </Switch>
      );
    }
    
    // Active subscription - show exchange
    return (
      <AuthenticatedLayout>
        <Switch>
          <Route path="/exchange/overview" component={InvestorOverviewPage} />
          <Route path="/exchange/auctions" component={InvestorExchangePage} />
          <Route path="/exchange/my-bids" component={InvestorMyBidsPage} />
          <Route path="/" component={InvestorOverviewPage} />
          <Route component={InvestorOverviewPage} />
        </Switch>
      </AuthenticatedLayout>
    );
  }

  // Admin and Analyst routes - full platform access
  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/judgments" component={JudgmentsPage} />
        <Route path="/bundles" component={BundlesPage} />
        <Route path="/bonds" component={BondsPage} />
        <Route path="/underwriting" component={UnderwritingPage} />
        <Route path="/surety" component={SuretyDashboardPage} />
        <Route path="/investor" component={InvestorDashboardPage} />
        <Route path="/exchange/overview" component={InvestorOverviewPage} />
        <Route path="/exchange/auctions" component={InvestorExchangePage} />
        <Route path="/exchange/my-bids" component={InvestorMyBidsPage} />
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
