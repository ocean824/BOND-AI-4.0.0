import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Shield, TrendingUp, FileText } from "lucide-react";
import { TermsAndConditionsContent } from "@/components/terms-and-conditions-content";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { register } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [accountType, setAccountType] = useState<"analyst" | "investor">("analyst");
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const role = params.get("role");
    if (role === "investor" || role === "analyst") {
      setAccountType(role);
    }
  }, [searchString]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!termsAccepted) {
      toast({
        variant: "destructive",
        title: "Terms Required",
        description: "You must accept the Terms & Conditions to register",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      await register(email, password, name, accountType, inviteCode);
      toast({
        title: "Registration successful",
        description: accountType === "investor" 
          ? "Welcome to the Bond Exchange" 
          : "Welcome to Judgment Bond AI",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Could not create account",
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
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>
              Choose your account type and sign up to get started
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">Account Type</Label>
                <RadioGroup
                  value={accountType}
                  onValueChange={(value) => setAccountType(value as "analyst" | "investor")}
                  className="grid grid-cols-2 gap-4"
                  data-testid="radio-account-type"
                >
                  <div>
                    <RadioGroupItem
                      value="analyst"
                      id="analyst"
                      className="peer sr-only"
                      data-testid="radio-analyst"
                    />
                    <Label
                      htmlFor="analyst"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover-elevate cursor-pointer peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <FileText className="mb-3 h-6 w-6" />
                      <span className="text-sm font-semibold">Analyst</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        Full platform access
                      </span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="investor"
                      id="investor"
                      className="peer sr-only"
                      data-testid="radio-investor"
                    />
                    <Label
                      htmlFor="investor"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover-elevate cursor-pointer peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <TrendingUp className="mb-3 h-6 w-6" />
                      <span className="text-sm font-semibold">Investor</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        Bond Exchange only
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  data-testid="input-name"
                />
              </div>
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
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code *</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="BOND-XXX-XXXXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  data-testid="input-invite-code"
                />
                <p className="text-xs text-muted-foreground">
                  You need an invite code to create an account. Contact an administrator to get one.
                </p>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="terms" 
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  data-testid="checkbox-terms"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I accept the{" "}
                    <Dialog>
                      <DialogTrigger asChild>
                        <button type="button" className="text-primary underline hover:no-underline">
                          Terms & Conditions
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle>Terms & Conditions</DialogTitle>
                          <DialogDescription>
                            Please read and accept our terms to continue
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[60vh] pr-4">
                          <TermsAndConditionsContent />
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Required to create an account
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-register"
              >
                {isLoading ? "Creating account..." : `Create ${accountType === "investor" ? "Investor" : "Analyst"} Account`}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setLocation("/")}
                data-testid="button-login-link"
              >
                Already have an account? Sign In
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-xs text-center text-muted-foreground mt-6">
          {accountType === "investor" ? (
            <>
              Investor accounts have access to the Bond Exchange only.
              <br />
              For full platform access, select Analyst.
            </>
          ) : (
            <>
              By creating an account, you agree to our Terms of Service.
              <br />
              AI analysis is for informational purposes only.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
