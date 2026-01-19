import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  PlayCircle, 
  TrendingUp, 
  Gavel, 
  DollarSign,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export default function InvestorDemoPage() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = [
    {
      title: "Welcome to the Bond Exchange",
      description: "Learn how to participate in live auctions and place bids on judgment bonds",
      icon: PlayCircle,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The Bond Exchange is where you can invest in judgment bonds through a transparent auction system.
            This tutorial will guide you through the entire process.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              What You'll Learn
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• How to browse available bonds</li>
              <li>• Understanding bond details and pricing</li>
              <li>• Placing bids in live auctions</li>
              <li>• Monitoring your investments</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: "Browsing Available Bonds",
      description: "Find bonds that match your investment criteria",
      icon: TrendingUp,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The Bond Exchange displays all available judgment bonds. Each bond card shows key information:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold text-sm mb-1">Face Value</h4>
              <p className="text-xs text-muted-foreground">
                The total judgment amount awarded by the court
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold text-sm mb-1">Current Bid</h4>
              <p className="text-xs text-muted-foreground">
                The highest bid placed so far in the auction
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold text-sm mb-1">Expected Return</h4>
              <p className="text-xs text-muted-foreground">
                Estimated return based on recovery scenarios
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold text-sm mb-1">Risk Score</h4>
              <p className="text-xs text-muted-foreground">
                AI-calculated risk assessment (1-100)
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Understanding Pricing Scenarios",
      description: "Learn how to interpret base, optimistic, and stressed scenarios",
      icon: DollarSign,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Each bond includes three pricing scenarios to help you make informed decisions:
          </p>
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-green-600 text-white">Optimistic</Badge>
                <span className="text-sm font-semibold">Best Case Scenario</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Assumes favorable conditions: quick collection, high recovery rate, minimal legal costs
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-blue-600 text-white">Base</Badge>
                <span className="text-sm font-semibold">Expected Scenario</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Most likely outcome based on historical data and current market conditions
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-red-600 text-white">Stressed</Badge>
                <span className="text-sm font-semibold">Worst Case Scenario</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Assumes challenging conditions: slow collection, lower recovery, higher costs
              </p>
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Important Disclaimer
            </h4>
            <p className="text-xs text-muted-foreground">
              These are estimates, not guarantees. The final recovery amount and timeline may differ.
              Past performance does not guarantee future results. Invest only what you can afford to lose.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Placing Your First Bid",
      description: "Step-by-step guide to bidding in live auctions",
      icon: Gavel,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Ready to place a bid? Follow these steps:
          </p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Select a Bond</h4>
                <p className="text-xs text-muted-foreground">
                  Click on any bond card to view detailed information and pricing scenarios
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Review the Details</h4>
                <p className="text-xs text-muted-foreground">
                  Examine the debtor information, judgment amount, risk score, and pricing scenarios
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Enter Your Bid</h4>
                <p className="text-xs text-muted-foreground">
                  Enter your bid amount (must be higher than the current bid) and click "Place Bid"
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                4
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Confirm & Monitor</h4>
                <p className="text-xs text-muted-foreground">
                  Confirm your bid and monitor the auction. You'll be notified if you're outbid
                </p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-sm mb-2">Bidding Tips</h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Start with smaller bonds to learn the process</li>
              <li>• Consider the stressed scenario when determining your maximum bid</li>
              <li>• Factor in your desired return rate (IRR)</li>
              <li>• Watch for bonds with lower risk scores</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: "Monitoring Your Investments",
      description: "Track your bids and manage your portfolio",
      icon: CheckCircle,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            After placing bids, you can monitor your investments through the Exchange Overview:
          </p>
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold text-sm mb-1">Active Bids</h4>
              <p className="text-xs text-muted-foreground">
                View all your current bids and their status (winning, outbid, or pending)
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold text-sm mb-1">Won Auctions</h4>
              <p className="text-xs text-muted-foreground">
                Bonds you've successfully won will appear here with payment instructions
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold text-sm mb-1">Portfolio Performance</h4>
              <p className="text-xs text-muted-foreground">
                Track the performance of your investments including recovery status and returns
              </p>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              You're Ready!
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              You now know how to use the Bond Exchange. Click the button below to start investing!
            </p>
            <Button 
              onClick={() => setLocation("/investor/exchange")}
              className="w-full"
            >
              Go to Bond Exchange
            </Button>
          </div>
        </div>
      ),
    },
  ];

  const currentTutorial = tutorialSteps[currentStep];
  const Icon = currentTutorial.icon;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back Navigation */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/investor")}
          className="gap-1 pl-0 hover:pl-1 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Tutorial Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Bond Exchange Tutorial</h1>
        <p className="text-muted-foreground">
          Interactive guide to help you get started with investing in judgment bonds
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {tutorialSteps.length}
          </span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tutorial Content */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>{currentTutorial.title}</CardTitle>
              <CardDescription>{currentTutorial.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentTutorial.content}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        {currentStep < tutorialSteps.length - 1 ? (
          <Button onClick={() => setCurrentStep(Math.min(tutorialSteps.length - 1, currentStep + 1))}>
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={() => setLocation("/investor/exchange")}>
            Start Investing
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Quick Links */}
      <div className="mt-8 pt-6 border-t">
        <h3 className="font-semibold mb-3">Quick Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button 
            variant="outline" 
            className="justify-start"
            onClick={() => setLocation("/investor/exchange")}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Bond Exchange
          </Button>
          <Button 
            variant="outline" 
            className="justify-start"
            onClick={() => setLocation("/investor/exchange/overview")}
          >
            <Gavel className="w-4 h-4 mr-2" />
            Exchange Overview
          </Button>
          <Button 
            variant="outline" 
            className="justify-start"
            onClick={() => setLocation("/investor")}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Investor Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
