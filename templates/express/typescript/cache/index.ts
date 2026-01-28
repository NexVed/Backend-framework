/**
 * Cache Module
 * In-memory and Redis caching
 */

export { cache, createCache, CacheDriver } from './memory';
export { createRedisCache, RedisCache } from './redis';

import { cache } from './memory';

/**
 * Cache decorator for functions
 * Usage: const cachedFn = withCache(myFunction, 'cache-key', 300);
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyPrefix: string,
    ttl: number = 3600
): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        const key = `${keyPrefix}:${JSON.stringify(args)}`;

        // Check cache first
        const cached = cache.get<ReturnType<T>>(key);
        if (cached !== undefined) {
            return cached;
        }

        // Execute function and cache result
        const result = await fn(...args);
        cache.set(key, result, ttl);

        return result;
    }) as T;
}

/**
 * Cache key generator helpers
 */
export const cacheKey = {
    /**
     * Generate key for entity by ID
     */
    entity: (type: string, id: string | number) => `${type}:${id}`,

    /**
     * Generate key for list with optional filters
     */
    list: (type: string, filters?: Record<string, any>) => {
        const filterStr = filters ? `:${JSON.stringify(filters)}` : '';
        return `${type}:list${filterStr}`;
    },

    /**
     * Generate key for user-specific data
     */
    user: (userId: string, type: string) => `user:${userId}:${type}`,

    /**
     * Generate key with custom prefix
     */
    custom: (...parts: (string | number)[]) => parts.join(':'),
};

/**
 * Cache patterns for common use cases
 */
export const cachePatterns = {
    /**
     * Cache-aside pattern: get from cache, fallback to source
     */
    async getOrSet<T>(
        key: string,
        fetchFn: () => Promise<T>,
        ttl: number = 3600
    ): Promise<T> {
        const cached = cache.get<T>(key);
        if (cached !== undefined) {
            return cached;
        }

        const data = await fetchFn();
        cache.set(key, data, ttl);
        return data;
    },

    /**
     * Invalidate cache on write
     */
    invalidateOnWrite<T>(
        keys: string | string[],
        writeFn: () => Promise<T>
    ): Promise<T> {
        return writeFn().then(result => {
            const keysToDelete = Array.isArray(keys) ? keys : [keys];
            keysToDelete.forEach(key => cache.delete(key));
            return result;
        });
    },

    /**
     * Invalidate by pattern (prefix)
     */
    invalidateByPrefix(prefix: string): number {
        return cache.deleteByPrefix(prefix);
    },
};
