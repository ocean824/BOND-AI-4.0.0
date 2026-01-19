import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, Database } from "lucide-react";
import { adminApiRequest } from "@/lib/adminQueryClient";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLedgerPage() {
  const [, setLocation] = useLocation();

  const { data: trialBalance, isLoading } = useQuery({
    queryKey: ["/api/admin/ledger/trial-balance"],
    queryFn: async () => {
      const res = await adminApiRequest("/api/admin/ledger/trial-balance");
      if (!res.ok) throw new Error("Failed to fetch trial balance");
      return res.json();
    },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/admin/panel")}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Admin Panel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Ledger Trial Balance
          </CardTitle>
          <CardDescription>Double-entry accounting system</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Balance Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialBalance?.balances?.map((account: any) => (
                    <TableRow key={account.accountCode}>
                      <TableCell className="font-mono">{account.accountCode}</TableCell>
                      <TableCell>{account.accountName}</TableCell>
                      <TableCell>{account.accountType}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${parseFloat(account.balance).toLocaleString()}
                      </TableCell>
                      <TableCell>{account.balanceType}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Debits</p>
                    <p className="text-2xl font-bold font-mono">
                      ${parseFloat(trialBalance?.totalDebits || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Credits</p>
                    <p className="text-2xl font-bold font-mono">
                      ${parseFloat(trialBalance?.totalCredits || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm">
                    Status: {trialBalance?.isBalanced ? "✅ Balanced" : "❌ Unbalanced"}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
