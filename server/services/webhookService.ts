import crypto from 'crypto';
import { db } from '../db';
import { webhooks, webhookDeliveries } from '@shared/schema-web3';
import { eq, and } from 'drizzle-orm';

export interface WebhookEvent {
  type: string;
  data: any;
  timestamp: Date;
  entityType?: string;
  entityId?: number;
}

export class WebhookService {
  /**
   * Register a webhook
   */
  async registerWebhook(
    userId: number,
    name: string,
    url: string,
    events: string[],
    secret?: string
  ): Promise<number> {
    // Generate secret if not provided
    const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

    const [webhook] = await db.insert(webhooks).values({
      userId,
      name,
      url,
      secret: webhookSecret,
      events,
      isActive: true,
    }).returning();

    return webhook.id;
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Trigger webhooks for an event
   */
  async triggerEvent(event: WebhookEvent): Promise<void> {
    // Find all active webhooks subscribed to this event type
    const activeWebhooks = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.isActive, true));

    const relevantWebhooks = activeWebhooks.filter(webhook => {
      const events = webhook.events as string[];
      return events.includes(event.type) || events.includes('*');
    });

    // Deliver to each webhook
    await Promise.all(
      relevantWebhooks.map(webhook => this.deliverWebhook(webhook, event))
    );
  }

  /**
   * Deliver webhook with retry logic
   */
  async deliverWebhook(
    webhook: any,
    event: WebhookEvent,
    attemptNumber: number = 1
  ): Promise<void> {
    const payload = JSON.stringify({
      event: event.type,
      data: event.data,
      timestamp: event.timestamp.toISOString(),
      entityType: event.entityType,
      entityId: event.entityId,
    });

    const signature = this.generateSignature(payload, webhook.secret);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Event-Type': event.type,
          'X-Webhook-ID': webhook.id.toString(),
          'User-Agent': 'BondAI-Webhook/1.0',
        },
        body: payload,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const responseBody = await response.text();

      // Record delivery
      await db.insert(webhookDeliveries).values({
        webhookId: webhook.id,
        eventType: event.type,
        payload: event.data,
        responseStatus: response.status,
        responseBody: responseBody.substring(0, 1000), // Limit to 1000 chars
        responseHeaders: Object.fromEntries(response.headers.entries()),
        attemptNumber,
        deliveredAt: new Date(),
      });

      // Update webhook last triggered
      await db.update(webhooks)
        .set({
          lastTriggeredAt: new Date(),
          failureCount: 0,
        })
        .where(eq(webhooks.id, webhook.id));

      if (!response.ok) {
        throw new Error(`Webhook returned status ${response.status}`);
      }
    } catch (error: any) {
      console.error(`Webhook delivery failed (attempt ${attemptNumber}):`, error);

      // Record failed delivery
      await db.insert(webhookDeliveries).values({
        webhookId: webhook.id,
        eventType: event.type,
        payload: event.data,
        responseStatus: 0,
        responseBody: error.message,
        attemptNumber,
        deliveredAt: new Date(),
      });

      // Update failure count
      const newFailureCount = (webhook.failureCount || 0) + 1;
      await db.update(webhooks)
        .set({
          failureCount: newFailureCount,
          lastFailureAt: new Date(),
          lastFailureReason: error.message,
          // Disable webhook after 10 consecutive failures
          isActive: newFailureCount < 10,
        })
        .where(eq(webhooks.id, webhook.id));

      // Retry with exponential backoff (max 3 attempts)
      if (attemptNumber < 3) {
        const delay = Math.pow(2, attemptNumber) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
        await this.deliverWebhook(webhook, event, attemptNumber + 1);
      }
    }
  }

  /**
   * Get webhooks for a user
   */
  async getUserWebhooks(userId: number) {
    return await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.userId, userId));
  }

  /**
   * Get webhook deliveries
   */
  async getWebhookDeliveries(webhookId: number, limit: number = 50) {
    return await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhookId))
      .orderBy(webhookDeliveries.createdAt)
      .limit(limit);
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    webhookId: number,
    updates: {
      name?: string;
      url?: string;
      events?: string[];
      isActive?: boolean;
    }
  ) {
    await db.update(webhooks)
      .set(updates)
      .where(eq(webhooks.id, webhookId));
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: number) {
    await db.delete(webhooks).where(eq(webhooks.id, webhookId));
  }

  /**
   * Test webhook
   */
  async testWebhook(webhookId: number): Promise<boolean> {
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, webhookId));

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testEvent: WebhookEvent = {
      type: 'test',
      data: {
        message: 'This is a test webhook from BondAI',
        webhookId: webhook.id,
        webhookName: webhook.name,
      },
      timestamp: new Date(),
    };

    try {
      await this.deliverWebhook(webhook, testEvent);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const webhookService = new WebhookService();

// Predefined event types
export const WEBHOOK_EVENTS = {
  // Bond events
  BOND_CREATED: 'bond.created',
  BOND_PERFECTED: 'bond.perfected',
  BOND_UPDATED: 'bond.updated',
  
  // Auction events
  AUCTION_STARTED: 'auction.started',
  AUCTION_BID_PLACED: 'auction.bid_placed',
  AUCTION_COMPLETED: 'auction.completed',
  AUCTION_CANCELLED: 'auction.cancelled',
  
  // Trade events
  TRADE_CREATED: 'trade.created',
  TRADE_SETTLED: 'trade.settled',
  TRADE_FAILED: 'trade.failed',
  
  // Distribution events
  DISTRIBUTION_CREATED: 'distribution.created',
  DISTRIBUTION_EXECUTED: 'distribution.executed',
  DISTRIBUTION_FAILED: 'distribution.failed',
  
  // Blockchain events
  TOKEN_TRANSFERRED: 'token.transferred',
  NFT_MINTED: 'nft.minted',
  STAKE_LOCKED: 'stake.locked',
  STAKE_UNLOCKED: 'stake.unlocked',
  
  // User events
  USER_REGISTERED: 'user.registered',
  WALLET_LINKED: 'wallet.linked',
  
  // All events
  ALL: '*',
};
