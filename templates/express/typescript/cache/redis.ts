/**
 * Redis Cache
 * Distributed caching for multi-instance deployments
 */

import { createClient, RedisClientType } from 'redis';
import { CacheDriver } from './memory';

export class RedisCache implements CacheDriver {
    private client: RedisClientType;
    private prefix: string;
    private defaultTTL: number;
    private connected = false;

    constructor(options: {
        url: string;
        prefix?: string;
        defaultTTL?: number;
    }) {
        this.client = createClient({ url: options.url });
        this.prefix = options.prefix || 'cache:';
        this.defaultTTL = options.defaultTTL || 3600;

        this.client.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });

        this.client.on('connect', () => {
            console.log('✅ Redis connected');
            this.connected = true;
        });

        this.client.on('disconnect', () => {
            console.log('🔌 Redis disconnected');
            this.connected = false;
        });
    }

    /**
     * Connect to Redis
     */
    async connect(): Promise<void> {
        if (!this.connected) {
            await this.client.connect();
        }
    }

    /**
     * Disconnect from Redis
     */
    async disconnect(): Promise<void> {
        if (this.connected) {
            await this.client.quit();
        }
    }

    /**
     * Get prefixed key
     */
    private key(k: string): string {
        return `${this.prefix}${k}`;
    }

    /**
     * Get value from cache
     */
    get<T>(key: string): T | undefined {
        // Note: This is synchronous interface, but Redis is async
        // Use getAsync for proper async usage
        console.warn('RedisCache.get() is sync interface - use getAsync() instead');
        return undefined;
    }

    /**
     * Async get value from cache
     */
    async getAsync<T>(key: string): Promise<T | undefined> {
        try {
            const data = await this.client.get(this.key(key));
            if (data === null) return undefined;
            return JSON.parse(data) as T;
        } catch (error) {
            console.error('Redis get error:', error);
            return undefined;
        }
    }

    /**
     * Set value in cache
     */
    set<T>(key: string, value: T, ttl?: number): void {
        // Sync interface - fire and forget
        this.setAsync(key, value, ttl).catch(console.error);
    }

    /**
     * Async set value in cache
     */
    async setAsync<T>(key: string, value: T, ttl?: number): Promise<void> {
        try {
            const data = JSON.stringify(value);
            await this.client.setEx(this.key(key), ttl ?? this.defaultTTL, data);
        } catch (error) {
            console.error('Redis set error:', error);
        }
    }

    /**
     * Check if key exists
     */
    has(key: string): boolean {
        console.warn('RedisCache.has() is sync interface - use hasAsync() instead');
        return false;
    }

    /**
     * Async check if key exists
     */
    async hasAsync(key: string): Promise<boolean> {
        try {
            const exists = await this.client.exists(this.key(key));
            return exists === 1;
        } catch (error) {
            console.error('Redis exists error:', error);
            return false;
        }
    }

    /**
     * Delete key from cache
     */
    delete(key: string): boolean {
        this.deleteAsync(key).catch(console.error);
        return true;
    }

    /**
     * Async delete key from cache
     */
    async deleteAsync(key: string): Promise<boolean> {
        try {
            const result = await this.client.del(this.key(key));
            return result === 1;
        } catch (error) {
            console.error('Redis delete error:', error);
            return false;
        }
    }

    /**
     * Delete all keys matching prefix
     */
    deleteByPrefix(prefix: string): number {
        this.deleteByPrefixAsync(prefix).catch(console.error);
        return 0;
    }

    /**
     * Async delete all keys matching prefix
     */
    async deleteByPrefixAsync(prefix: string): Promise<number> {
        try {
            const pattern = this.key(`${prefix}*`);
            const keys = await this.client.keys(pattern);

            if (keys.length === 0) return 0;

            const result = await this.client.del(keys);
            return result;
        } catch (error) {
            console.error('Redis delete by prefix error:', error);
            return 0;
        }
    }

    /**
     * Clear all cache entries with prefix
     */
    clear(): void {
        this.clearAsync().catch(console.error);
    }

    /**
     * Async clear all cache entries with prefix
     */
    async clearAsync(): Promise<void> {
        try {
            const pattern = `${this.prefix}*`;
            const keys = await this.client.keys(pattern);

            if (keys.length > 0) {
                await this.client.del(keys);
            }
        } catch (error) {
            console.error('Redis clear error:', error);
        }
    }

    /**
     * Get all keys with prefix
     */
    keys(): string[] {
        console.warn('RedisCache.keys() is sync interface - use keysAsync() instead');
        return [];
    }

    /**
     * Async get all keys with prefix
     */
    async keysAsync(): Promise<string[]> {
        try {
            const pattern = `${this.prefix}*`;
            const keys = await this.client.keys(pattern);
            return keys.map(k => k.replace(this.prefix, ''));
        } catch (error) {
            console.error('Redis keys error:', error);
            return [];
        }
    }

    /**
     * Get cache size
     */
    size(): number {
        console.warn('RedisCache.size() is sync interface - use sizeAsync() instead');
        return 0;
    }

    /**
     * Async get cache size
     */
    async sizeAsync(): Promise<number> {
        try {
            const keys = await this.keysAsync();
            return keys.length;
        } catch (error) {
            console.error('Redis size error:', error);
            return 0;
        }
    }

    /**
     * Get or set with callback
     */
    async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
        const cached = await this.getAsync<T>(key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await fetchFn();
        await this.setAsync(key, value, ttl);
        return value;
    }

    /**
     * Increment a numeric value
     */
    async increment(key: string, amount: number = 1): Promise<number> {
        try {
            return await this.client.incrBy(this.key(key), amount);
        } catch (error) {
            console.error('Redis increment error:', error);
            return 0;
        }
    }

    /**
     * Get remaining TTL for key
     */
    async ttl(key: string): Promise<number> {
        try {
            return await this.client.ttl(this.key(key));
        } catch (error) {
            console.error('Redis TTL error:', error);
            return -1;
        }
    }

    /**
     * Get the raw Redis client
     */
    getClient(): RedisClientType {
        return this.client;
    }
}

/**
 * Create Redis cache instance
 */
export function createRedisCache(options: {
    url: string;
    prefix?: string;
    defaultTTL?: number;
}): RedisCache {
    return new RedisCache(options);
}
