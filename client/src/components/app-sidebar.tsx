import { Home, FileText, Package, Coins, TrendingUp, Shield, Gavel, History, BarChart3, LogOut, Scale, Briefcase, Trophy, Receipt } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

type MenuItem = {
  title: string;
  url: string;
  icon: any;
  testId: string;
  roles?: string[];
};

const mainMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: Home, testId: "nav-dashboard", roles: ["admin", "analyst"] },
  { title: "Judgments", url: "/judgments", icon: FileText, testId: "nav-judgments", roles: ["admin", "analyst"] },
  { title: "Bundles", url: "/bundles", icon: Package, testId: "nav-bundles", roles: ["admin", "analyst"] },
  { title: "Bonds", url: "/bonds", icon: Coins, testId: "nav-bonds", roles: ["admin", "analyst"] },
  { title: "Underwriting", url: "/underwriting", icon: Shield, testId: "nav-underwriting", roles: ["admin", "analyst"] },
  { title: "Surety System", url: "/surety", icon: Scale, testId: "nav-surety", roles: ["admin"] },
  { title: "Investor Metrics", url: "/investor", icon: TrendingUp, testId: "nav-investor", roles: ["admin", "analyst"] },
];

const exchangeMenuItems: MenuItem[] = [
  { title: "Exchange Overview", url: "/exchange/overview", icon: BarChart3, testId: "nav-exchange-overview", roles: ["admin", "investor"] },
  { title: "Active Auctions", url: "/exchange/auctions", icon: Gavel, testId: "nav-exchange-auctions", roles: ["admin", "investor"] },
  { title: "My Bids", url: "/exchange/my-bids", icon: History, testId: "nav-exchange-my-bids", roles: ["admin", "investor"] },
  { title: "My Holdings", url: "/exchange/holdings", icon: Briefcase, testId: "nav-exchange-holdings", roles: ["admin", "investor"] },
  { title: "Bids Won", url: "/exchange/bids-won", icon: Trophy, testId: "nav-exchange-bids-won", roles: ["admin", "investor"] },
  { title: "Settlement", url: "/exchange/settlement", icon: Receipt, testId: "nav-exchange-settlement", roles: ["admin", "investor"] },
  { title: "Documents", url: "/exchange/documents", icon: FileText, testId: "nav-exchange-documents", roles: ["admin", "investor"] },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const userRole = user?.role || "analyst";
  
  const filterByRole = (items: MenuItem[]) => 
    items.filter(item => !item.roles || item.roles.includes(userRole));

  const visibleMainItems = filterByRole(mainMenuItems);
  const visibleExchangeItems = filterByRole(exchangeMenuItems);

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold px-2">
            Judgment Bond AI
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={item.testId}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleExchangeItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2">Bond Exchange</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleExchangeItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url} data-testid={item.testId}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
              {user?.email || ""}
            </p>
          </div>
        </div>
        {userRole === "investor" && (
          <Button
            variant="outline"
            className="w-full justify-start mb-2"
            onClick={() => {
              const event = new CustomEvent('startInvestorTour');
              window.dispatchEvent(event);
            }}
            data-testid="button-start-tour"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Start Tour
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
