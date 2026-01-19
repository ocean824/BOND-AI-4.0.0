import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (pin: string) => void;
  title?: string;
  description?: string;
  resource?: string;
}

export function PinDialog({
  open,
  onOpenChange,
  onSuccess,
  title = "Enter PIN",
  description = "This action requires PIN authentication",
  resource = "admin",
}: PinDialogProps) {
  const [pin, setPin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pin || pin.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid PIN",
        description: "PIN must be 6 digits",
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Verify PIN with backend
      const token = localStorage.getItem("auth_token") || localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin, resource }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Invalid PIN");
      }

      const data = await res.json();
      
      toast({
        title: "PIN Verified",
        description: `Access granted as ${data.role}`,
      });

      onSuccess(pin);
      setPin("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "PIN Verification Failed",
        description: error.message || "Invalid PIN",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    setPin("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pin">6-Digit PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-widest"
                autoFocus
                disabled={isVerifying}
              />
              <p className="text-xs text-muted-foreground">
                Enter your 6-digit PIN to continue
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isVerifying || pin.length !== 6}>
              {isVerifying ? "Verifying..." : "Verify PIN"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
