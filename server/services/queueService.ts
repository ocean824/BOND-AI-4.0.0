import Bull, { Queue, Job, JobOptions } from 'bull';
import Redis from 'ioredis';

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Queue definitions
 */
export const queues = {
  blockchainSync: new Bull('blockchain-sync', {
    redis: process.env.REDIS_URL,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  }),

  webhookDelivery: new Bull('webhook-delivery', {
    redis: process.env.REDIS_URL,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  }),

  email: new Bull('email', {
    redis: process.env.REDIS_URL,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 50,
      removeOnFail: 200,
    },
  }),

  distribution: new Bull('distribution', {
    redis: process.env.REDIS_URL,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  }),

  auctionAutomation: new Bull('auction-automation', {
    redis: process.env.REDIS_URL,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  }),

  tokenBalanceSync: new Bull('token-balance-sync', {
    redis: process.env.REDIS_URL,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 50,
      removeOnFail: 200,
    },
  }),
};

/**
 * Job processors
 */

// Blockchain sync processor
queues.blockchainSync.process(async (job: Job) => {
  const { txHash, chainId } = job.data;
  console.log(`Processing blockchain sync for tx ${txHash} on chain ${chainId}`);
  
  // Import here to avoid circular dependencies
  const { web3Service } = await import('./web3Service');
  
  const receipt = await web3Service.waitForTransaction(txHash, chainId);
  
  return {
    success: true,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };
});

// Webhook delivery processor
queues.webhookDelivery.process(async (job: Job) => {
  const { webhook, event } = job.data;
  console.log(`Delivering webhook ${webhook.id} for event ${event.type}`);
  
  const { webhookService } = await import('./webhookService');
  
  await webhookService.deliverWebhook(webhook, event);
  
  return { success: true };
});

// Email processor
queues.email.process(async (job: Job) => {
  const { to, subject, html, template, data } = job.data;
  console.log(`Sending email to ${to}: ${subject}`);
  
  // TODO: Implement email service
  // const { emailService } = await import('./emailService');
  // await emailService.send({ to, subject, html, template, data });
  
  return { success: true };
});

// Distribution processor
queues.distribution.process(async (job: Job) => {
  const { distributionId } = job.data;
  console.log(`Processing distribution ${distributionId}`);
  
  const { distributionService } = await import('./distributionService');
  
  await distributionService.executeDistributionPayouts(distributionId);
  
  return { success: true };
});

// Auction automation processor
queues.auctionAutomation.process(async (job: Job) => {
  const { action, auctionId } = job.data;
  console.log(`Processing auction automation: ${action} for auction ${auctionId}`);
  
  const { auctionAutomationService } = await import('./auctionAutomationService');
  
  if (action === 'start') {
    await auctionAutomationService.startAuction(auctionId);
  } else if (action === 'close') {
    await auctionAutomationService.closeAuction(auctionId);
  }
  
  return { success: true };
});

// Token balance sync processor
queues.tokenBalanceSync.process(async (job: Job) => {
  const { userId, walletAddress, tokenAddress, tokenSymbol, chainId } = job.data;
  console.log(`Syncing token balance for user ${userId}`);
  
  const { web3Service } = await import('./web3Service');
  
  await web3Service.syncTokenBalance(
    userId,
    walletAddress,
    tokenAddress,
    tokenSymbol,
    chainId
  );
  
  return { success: true };
});

/**
 * Queue service for adding jobs
 */
export class QueueService {
  /**
   * Add blockchain sync job
   */
  async syncBlockchainTransaction(txHash: string, chainId: number): Promise<Job> {
    return queues.blockchainSync.add(
      { txHash, chainId },
      {
        jobId: `${chainId}-${txHash}`,
        removeOnComplete: true,
      }
    );
  }

  /**
   * Add webhook delivery job
   */
  async deliverWebhook(webhook: any, event: any): Promise<Job> {
    return queues.webhookDelivery.add({ webhook, event });
  }

  /**
   * Add email job
   */
  async sendEmail(
    to: string,
    subject: string,
    options: {
      html?: string;
      template?: string;
      data?: any;
    }
  ): Promise<Job> {
    return queues.email.add({ to, subject, ...options });
  }

  /**
   * Add distribution job
   */
  async processDistribution(distributionId: number): Promise<Job> {
    return queues.distribution.add({ distributionId });
  }

  /**
   * Schedule auction start
   */
  async scheduleAuctionStart(auctionId: number, startDate: Date): Promise<Job> {
    const delay = startDate.getTime() - Date.now();
    
    if (delay < 0) {
      throw new Error('Start date is in the past');
    }
    
    return queues.auctionAutomation.add(
      { action: 'start', auctionId },
      {
        delay,
        jobId: `auction-start-${auctionId}`,
      }
    );
  }

  /**
   * Schedule auction close
   */
  async scheduleAuctionClose(auctionId: number, endDate: Date): Promise<Job> {
    const delay = endDate.getTime() - Date.now();
    
    if (delay < 0) {
      throw new Error('End date is in the past');
    }
    
    return queues.auctionAutomation.add(
      { action: 'close', auctionId },
      {
        delay,
        jobId: `auction-close-${auctionId}`,
      }
    );
  }

  /**
   * Sync token balance
   */
  async syncTokenBalance(
    userId: number,
    walletAddress: string,
    tokenAddress: string,
    tokenSymbol: string,
    chainId: number
  ): Promise<Job> {
    return queues.tokenBalanceSync.add({
      userId,
      walletAddress,
      tokenAddress,
      tokenSymbol,
      chainId,
    });
  }

  /**
   * Schedule recurring token balance sync
   */
  async scheduleRecurringTokenSync(
    userId: number,
    walletAddress: string,
    tokenAddress: string,
    tokenSymbol: string,
    chainId: number
  ): Promise<void> {
    await queues.tokenBalanceSync.add(
      {
        userId,
        walletAddress,
        tokenAddress,
        tokenSymbol,
        chainId,
      },
      {
        repeat: {
          every: 3600000, // Every hour
        },
        jobId: `token-sync-${userId}-${tokenAddress}-${chainId}`,
      }
    );
  }

  /**
   * Get queue stats
   */
  async getQueueStats(queueName: keyof typeof queues) {
    const queue = queues[queueName];
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    
    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Get all queue stats
   */
  async getAllQueueStats() {
    const stats: Record<string, any> = {};
    
    for (const [name, queue] of Object.entries(queues)) {
      stats[name] = await this.getQueueStats(name as keyof typeof queues);
    }
    
    return stats;
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(queueName: keyof typeof queues, grace: number = 7 * 24 * 60 * 60 * 1000) {
    const queue = queues[queueName];
    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName: keyof typeof queues) {
    await queues[queueName].pause();
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName: keyof typeof queues) {
    await queues[queueName].resume();
  }
}

// Singleton instance
export const queueService = new QueueService();

/**
 * Queue event listeners
 */
Object.entries(queues).forEach(([name, queue]) => {
  queue.on('completed', (job: Job, result: any) => {
    console.log(`Job ${job.id} in queue ${name} completed:`, result);
  });

  queue.on('failed', (job: Job, err: Error) => {
    console.error(`Job ${job.id} in queue ${name} failed:`, err.message);
  });

  queue.on('stalled', (job: Job) => {
    console.warn(`Job ${job.id} in queue ${name} stalled`);
  });
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('Closing queues...');
  
  await Promise.all(
    Object.values(queues).map(queue => queue.close())
  );
  
  await redis.quit();
  
  console.log('Queues closed');
  process.exit(0);
});
