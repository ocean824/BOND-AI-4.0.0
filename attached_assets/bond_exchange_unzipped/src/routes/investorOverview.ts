import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { db, bonds } from "../db";
import dayjs from "dayjs";
import { eq } from "drizzle-orm";

export const investorOverviewRouter = Router();

investorOverviewRouter.get(
  "/investor/overview",
  requireAuth(["INVESTOR"]),
  async (_req, res) => {
    const upcoming = await db
      .select({
        expectedPerfectedAt: bonds.expectedPerfectedAt,
        faceValue: bonds.faceValue,
        isPerfected: bonds.isPerfected,
      })
      .from(bonds)
      .where(eq(bonds.isPerfected, false));

    const now = dayjs();
    const next7d = now.add(7, "day");
    const next30d = now.add(30, "day");

    const totals = {
      next7Days: 0,
      next30Days: 0,
      later: 0,
    };

    for (const b of upcoming) {
      const fv = Number(b.faceValue ?? 0);
      const expectedDate = b.expectedPerfectedAt
        ? dayjs(b.expectedPerfectedAt)
        : null;

      if (!expectedDate) {
        totals.later += fv;
        continue;
      }

      if (expectedDate.isBefore(next7d)) {
        totals.next7Days += fv;
      } else if (expectedDate.isBefore(next30d)) {
        totals.next30Days += fv;
      } else {
        totals.later += fv;
      }
    }

    return res.json({ totals });
  }
);
