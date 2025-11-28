import express from "express";
import dotenv from "dotenv";
import { json } from "express";
import { investorOverviewRouter } from "./routes/investorOverview";
import { investorAuctionsRouter } from "./routes/investorAuctions";
import { investorBidsRouter } from "./routes/investorBids";
import { adminSuretyRouter } from "./routes/adminSurety";
import { blockInvestorsForNonInvestorRoutes } from "./middleware/auth";

dotenv.config();

const app = express();
app.use(json());

// DEMO auth stub: in your real app, replace this with real auth middleware.
// You can control the demo role via DEMO_ROLE env var: "INVESTOR" or "ADMIN".
app.use((req, _res, next) => {
  const demoRole = (process.env.DEMO_ROLE as any) || "ADMIN";
  (req as any).user = {
    id: "demo-user-id",
    email: "demo@example.com",
    role: demoRole,
  };
  next();
});

// Global guard: investors cannot hit non-investor routes
app.use(blockInvestorsForNonInvestorRoutes);

// Investor-facing Bond Exchange routes
app.use(investorOverviewRouter);
app.use(investorAuctionsRouter);
app.use(investorBidsRouter);

// Admin-only Surety routes
app.use(adminSuretyRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bond Exchange + Surety module listening on port ${PORT}`);
});
