import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { jaceWebhooks, exchangeTrades, users, bonds } from "@shared/schema";
import { createImmutableEvent } from "./immutableEventService";
import { updateTradeStatus, createSettlement } from "./tradeService";

type JaceInboundEvent = {
  eventId: string;
  eventType: string;
  correlationId?: string;
  data?: any;
};

function hmacSha256Hex(secret: string, payload: Buffer) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function verifyJaceSignature(rawBody: Buffer, signatureHeader: string | undefined) {
  const secret = process.env.JACE_WEBHOOK_SECRET || "";
  if (!secret) return { ok: false, reason: "Missing JACE_WEBHOOK_SECRET" };
  if (!signatureHeader) return { ok: false, reason: "Missing X-JACE-Signature" };
  const expected = hmacSha256Hex(secret, rawBody);
  return safeEqual(expected, signatureHeader) ? { ok: true } : { ok: false, reason: "Bad signature" };
}

export async function sendInvestorOnboardingToJace(payload: Record<string, any>) {
  const url = process.env.JACE_CRM_WEBHOOK_URL || "";
  if (!url) {
    // Allow local/dev environments to proceed without failing.
    return { delivered: false, status: "NO_URL" as const };
  }

  const body = JSON.stringify(payload);
  const secret = process.env.BONDAI_TO_JACE_SECRET || "";
  const signature = secret ? hmacSha256Hex(secret, Buffer.from(body)) : undefined;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(signature ? { "X-BondAI-Signature": signature } : {}),
      "User-Agent": "BondAI/1.0 (+JACE)",
    },
    body,
  });

  const ok = res.ok;
  const statusText = `${res.status} ${res.statusText}`.trim();
  return { delivered: ok, status: ok ? ("DELIVERED" as const) : ("FAILED" as const), statusText };
}

export async function ingestJaceWebhook(rawBody: Buffer) {
  const parsed = JSON.parse(rawBody.toString("utf8")) as any;
  const event: JaceInboundEvent = {
    eventId: parsed.eventId || parsed.id,
    eventType: parsed.eventType || parsed.type,
    correlationId: parsed.correlationId,
    data: parsed.data ?? parsed,
  };

  if (!event.eventId || !event.eventType) {
    throw new Error("JACE webhook missing eventId/eventType");
  }

  const existing = await db
    .select({ id: jaceWebhooks.id })
    .from(jaceWebhooks)
    .where(eq(jaceWebhooks.jaceEventId, event.eventId))
    .limit(1);
  if (existing.length) {
    return { duplicate: true };
  }

  const inserted = await db
    .insert(jaceWebhooks)
    .values({
      jaceEventId: event.eventId,
      eventType: event.eventType,
      payload: parsed,
      status: "RECEIVED",
    })
    .returning();

  const rowId = inserted[0]?.id;

  try {
    await handleJaceEvent(event);
    if (rowId) {
      await db
        .update(jaceWebhooks)
        .set({ status: "PROCESSED", processedAt: new Date() })
        .where(eq(jaceWebhooks.id, rowId));
    }
    return { duplicate: false };
  } catch (err: any) {
    if (rowId) {
      await db
        .update(jaceWebhooks)
        .set({ status: "FAILED", processedAt: new Date(), errorMessage: err?.message || String(err) })
        .where(eq(jaceWebhooks.id, rowId));
    }
    throw err;
  }
}

async function handleJaceEvent(event: JaceInboundEvent) {
  // Record everything in immutable audit trail (even if trade not found)
  await createImmutableEvent({
    type: "JACE_WEBHOOK_RECEIVED",
    actorType: "SYSTEM",
    entityType: "SYSTEM",
    entityId: "JACE",
    payload: {
      eventId: event.eventId,
      eventType: event.eventType,
      correlationId: event.correlationId,
      data: event.data,
    } as any,
    correlationId: event.correlationId,
    metadata: { source: "JACE" },
  });

  const et = event.eventType.toLowerCase();
  if (et.includes("trade.paid") || et.includes("bid.paid") || et.includes("payment.confirmed")) {
    const tradeId = event.data?.tradeId || event.data?.exchangeTradeId;
    if (tradeId) {
      const id = Number(tradeId);
      const paymentReference =
        event.data?.paymentReference ||
        event.data?.paymentRef ||
        event.data?.reference ||
        event.data?.payment_intent ||
        event.eventId;

      // Mark paid + persist JACE metadata
      await updateTradeStatus(id, "PAID");
      await db
        .update(exchangeTrades)
        .set({
          jaceSessionId: event.data?.sessionId || event.data?.jaceSessionId || undefined,
          jaceSessionStatus: "PAID",
          jacePaymentReference: paymentReference,
          jacePaidAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(eq(exchangeTrades.id, id));

      // Load names for settlement metadata
      const [row] = await db
        .select({
          investorEmail: users.email,
          investorName: users.name,
          bondName: bonds.name,
          bondId: exchangeTrades.bondId,
        })
        .from(exchangeTrades)
        .leftJoin(users, eq(exchangeTrades.investorId, users.id))
        .leftJoin(bonds, eq(exchangeTrades.bondId, bonds.id))
        .where(eq(exchangeTrades.id, id));

      await createSettlement(
        id,
        row?.investorEmail || "unknown@invalid",
        row?.investorName || "Investor",
        row?.bondName || `Bond #${id}`
      );

      await createImmutableEvent({
        type: "JACE_PAYMENT_CONFIRMED",
        actorType: "SYSTEM",
        entityType: "EXCHANGE_TRADE",
        entityId: id,
        payload: { tradeId: id, eventId: event.eventId, ...event.data } as any,
        correlationId: event.correlationId,
        metadata: { source: "JACE" },
      });
    }
  }

  if (et.includes("investor.onboarded") || et.includes("kyc.approved")) {
    await createImmutableEvent({
      type: "JACE_INVESTOR_ONBOARDED",
      actorType: "SYSTEM",
      entityType: "USER",
      entityId: event.data?.userId ? Number(event.data.userId) : "UNKNOWN",
      payload: { eventId: event.eventId, ...event.data } as any,
      correlationId: event.correlationId,
      metadata: { source: "JACE" },
    });
  }

}
