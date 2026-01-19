import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Cache service for Redis operations
 */
export class CacheService {
  private prefix: string;

  constructor(prefix: string = 'bondai') {
    this.prefix = prefix;
  }

  /**
   * Generate cache key with prefix
   */
  private key(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(this.key(key));
    return value ? JSON.parse(value) : null;
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await redis.setex(this.key(key), ttl, JSON.stringify(value));
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    await redis.del(this.key(key));
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(this.key(key));
    return result === 1;
  }

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    return await redis.incr(this.key(key));
  }

  /**
   * Decrement value
   */
  async decr(key: string): Promise<number> {
    return await redis.decr(this.key(key));
  }

  /**
   * Set expiration time
   */
  async expire(key: string, ttl: number): Promise<void> {
    await redis.expire(this.key(key), ttl);
  }

  /**
   * Get multiple values
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const prefixedKeys = keys.map(k => this.key(k));
    const values = await redis.mget(...prefixedKeys);
    return values.map(v => (v ? JSON.parse(v) : null));
  }

  /**
   * Set multiple values
   */
  async mset(entries: Record<string, any>, ttl?: number): Promise<void> {
    const pipeline = redis.pipeline();
    
    Object.entries(entries).forEach(([key, value]) => {
      const prefixedKey = this.key(key);
      if (ttl) {
        pipeline.setex(prefixedKey, ttl, JSON.stringify(value));
      } else {
        pipeline.set(prefixedKey, JSON.stringify(value));
      }
    });
    
    await pipeline.exec();
  }

  /**
   * Invalidate keys matching pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await redis.keys(this.key(pattern));
    if (keys.length > 0) {
      return await redis.del(...keys);
    }
    return 0;
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    await this.set(key, value, ttl);
    
    return value;
  }

  /**
   * Hash operations
   */
  async hget(key: string, field: string): Promise<string | null> {
    return await redis.hget(this.key(key), field);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await redis.hset(this.key(key), field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await redis.hgetall(this.key(key));
  }

  async hdel(key: string, ...fields: string[]): Promise<void> {
    await redis.hdel(this.key(key), ...fields);
  }

  /**
   * List operations
   */
  async lpush(key: string, ...values: string[]): Promise<void> {
    await redis.lpush(this.key(key), ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<void> {
    await redis.rpush(this.key(key), ...values);
  }

  async lpop(key: string): Promise<string | null> {
    return await redis.lpop(this.key(key));
  }

  async rpop(key: string): Promise<string | null> {
    return await redis.rpop(this.key(key));
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await redis.lrange(this.key(key), start, stop);
  }

  /**
   * Set operations
   */
  async sadd(key: string, ...members: string[]): Promise<void> {
    await redis.sadd(this.key(key), ...members);
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    await redis.srem(this.key(key), ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return await redis.smembers(this.key(key));
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const result = await redis.sismember(this.key(key), member);
    return result === 1;
  }

  /**
   * Sorted set operations
   */
  async zadd(key: string, score: number, member: string): Promise<void> {
    await redis.zadd(this.key(key), score, member);
  }

  async zrem(key: string, ...members: string[]): Promise<void> {
    await redis.zrem(this.key(key), ...members);
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return await redis.zrange(this.key(key), start, stop);
  }

  async zrangebyscore(
    key: string,
    min: number,
    max: number
  ): Promise<string[]> {
    return await redis.zrangebyscore(this.key(key), min, max);
  }

  /**
   * Pub/Sub operations
   */
  async publish(channel: string, message: any): Promise<void> {
    await redis.publish(this.key(channel), JSON.stringify(message));
  }

  subscribe(channel: string, handler: (message: any) => void): void {
    const subscriber = redis.duplicate();
    subscriber.subscribe(this.key(channel));
    subscriber.on('message', (ch, msg) => {
      if (ch === this.key(channel)) {
        handler(JSON.parse(msg));
      }
    });
  }

  /**
   * Lock operations (distributed locking)
   */
  async acquireLock(
    resource: string,
    ttl: number = 10000
  ): Promise<string | null> {
    const lockKey = this.key(`lock:${resource}`);
    const lockValue = Math.random().toString(36);
    
    const result = await redis.set(lockKey, lockValue, 'PX', ttl, 'NX');
    
    return result === 'OK' ? lockValue : null;
  }

  async releaseLock(resource: string, lockValue: string): Promise<boolean> {
    const lockKey = this.key(`lock:${resource}`);
    
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    const result = await redis.eval(script, 1, lockKey, lockValue);
    return result === 1;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    const keys = await redis.keys(this.key('*'));
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /**
   * Get cache stats
   */
  async getStats(): Promise<{
    keys: number;
    memory: string;
    hits: number;
    misses: number;
  }> {
    const info = await redis.info('stats');
    const keys = await redis.dbsize();
    
    // Parse info string
    const stats = info.split('\r\n').reduce((acc, line) => {
      const [key, value] = line.split(':');
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);
    
    return {
      keys,
      memory: stats.used_memory_human || '0',
      hits: parseInt(stats.keyspace_hits || '0'),
      misses: parseInt(stats.keyspace_misses || '0'),
    };
  }
}

// Singleton instances for different cache namespaces
export const cacheService = new CacheService('bondai');
export const userCache = new CacheService('bondai:user');
export const bondCache = new CacheService('bondai:bond');
export const auctionCache = new CacheService('bondai:auction');
export const web3Cache = new CacheService('bondai:web3');

/**
 * Cache decorators
 */
export function Cached(ttl: number = 3600) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `method:${propertyKey}:${JSON.stringify(args)}`;
      
      const cached = await cacheService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
      
      const result = await originalMethod.apply(this, args);
      await cacheService.set(cacheKey, result, ttl);
      
      return result;
    };
    
    return descriptor;
  };
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  await redis.quit();
});
