/**
 * In-Memory Cache
 * Simple, fast cache for single-instance deployments
 */

export interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

export interface CacheDriver {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T, ttl?: number): void;
    delete(key: string): boolean;
    has(key: string): boolean;
    clear(): void;
    keys(): string[];
    size(): number;
    deleteByPrefix(prefix: string): number;
}

export class MemoryCache implements CacheDriver {
    private store = new Map<string, CacheEntry<any>>();
    private defaultTTL: number;
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(defaultTTL: number = 3600) {
        this.defaultTTL = defaultTTL;
        this.startCleanup();
    }

    /**
     * Get value from cache
     */
    get<T>(key: string): T | undefined {
        const entry = this.store.get(key);

        if (!entry) return undefined;

        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }

        return entry.value as T;
    }

    /**
     * Set value in cache
     */
    set<T>(key: string, value: T, ttl?: number): void {
        const expiresAt = Date.now() + ((ttl ?? this.defaultTTL) * 1000);
        this.store.set(key, { value, expiresAt });
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean {
        return this.get(key) !== undefined;
    }

    /**
     * Delete key from cache
     */
    delete(key: string): boolean {
        return this.store.delete(key);
    }

    /**
     * Delete all keys matching prefix
     */
    deleteByPrefix(prefix: string): number {
        let count = 0;
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
                count++;
            }
        }
        return count;
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.store.clear();
    }

    /**
     * Get all keys
     */
    keys(): string[] {
        return Array.from(this.store.keys());
    }

    /**
     * Get cache size
     */
    size(): number {
        return this.store.size;
    }

    /**
     * Get or set with callback
     */
    async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
        const cached = this.get<T>(key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await fetchFn();
        this.set(key, value, ttl);
        return value;
    }

    /**
     * Increment a numeric value
     */
    increment(key: string, amount: number = 1): number {
        const current = this.get<number>(key) || 0;
        const newValue = current + amount;

        // Preserve existing TTL if key exists
        const entry = this.store.get(key);
        if (entry) {
            const remainingTTL = Math.floor((entry.expiresAt - Date.now()) / 1000);
            this.set(key, newValue, remainingTTL > 0 ? remainingTTL : this.defaultTTL);
        } else {
            this.set(key, newValue);
        }

        return newValue;
    }

    /**
     * Start cleanup interval
     */
    private startCleanup(intervalMs: number = 60000): void {
        if (this.cleanupInterval) return;

        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.store.entries()) {
                if (now > entry.expiresAt) {
                    this.store.delete(key);
                }
            }
        }, intervalMs);

        // Don't prevent Node.js from exiting
        this.cleanupInterval.unref();
    }

    /**
     * Stop cleanup interval
     */
    stopCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * Get cache stats
     */
    stats(): { size: number; keys: number } {
        let totalSize = 0;
        const now = Date.now();
        let validKeys = 0;

        for (const [key, entry] of this.store.entries()) {
            if (now <= entry.expiresAt) {
                validKeys++;
                totalSize += JSON.stringify(entry.value).length * 2; // Rough byte estimate
            }
        }

        return { size: totalSize, keys: validKeys };
    }
}

// Singleton instance
export const cache = new MemoryCache();

// Factory function
export function createCache(defaultTTL?: number): MemoryCache {
    return new MemoryCache(defaultTTL);
}
