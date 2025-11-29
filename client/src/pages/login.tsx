import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, TrendingUp, FileText } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: "Login successful",
        description: "Welcome back to Judgment Bond AI",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid credentials",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              <p className="text-sm text-muted-foreground">AI-Powered Underwriting Platform</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || authLoading}
                data-testid="button-login"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setLocation("/register")}
                data-testid="button-register-link"
              >
                Don't have an account? Register
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border">
            <FileText className="w-4 h-4 text-primary" />
            <div className="text-xs">
              <p className="font-medium">Analyst</p>
              <p className="text-muted-foreground">Full platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border">
            <TrendingUp className="w-4 h-4 text-primary" />
            <div className="text-xs">
              <p className="font-medium">Investor</p>
              <p className="text-muted-foreground">Exchange only</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          This platform provides AI-powered judgment analysis and pricing.
          <br />
          Not legal or investment advice.
        </p>

        <div className="flex justify-center mt-4">
          <Link href="/admin/login" data-testid="link-admin">
            <span className="flex items-center gap-2 text-xs text-muted-foreground hover-elevate active-elevate-2 px-3 py-2 rounded-md transition-colors cursor-pointer">
              <Shield className="w-3 h-3" />
              Admin Access
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
