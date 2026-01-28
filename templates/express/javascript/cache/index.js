/**
 * Cache Module
 */

class MemoryCache {
    constructor(defaultTTL = 3600) {
        this.store = new Map();
        this.defaultTTL = defaultTTL;
        this.startCleanup();
    }

    get(key) {
        const entry = this.store.get(key);

        if (!entry) return undefined;

        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }

        return entry.value;
    }

    set(key, value, ttl) {
        const expiresAt = Date.now() + ((ttl ?? this.defaultTTL) * 1000);
        this.store.set(key, { value, expiresAt });
    }

    has(key) {
        return this.get(key) !== undefined;
    }

    delete(key) {
        return this.store.delete(key);
    }

    deleteByPrefix(prefix) {
        let count = 0;
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
                count++;
            }
        }
        return count;
    }

    clear() {
        this.store.clear();
    }

    keys() {
        return Array.from(this.store.keys());
    }

    size() {
        return this.store.size;
    }

    async getOrSet(key, fetchFn, ttl) {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await fetchFn();
        this.set(key, value, ttl);
        return value;
    }

    increment(key, amount = 1) {
        const current = this.get(key) || 0;
        const newValue = current + amount;

        const entry = this.store.get(key);
        if (entry) {
            const remainingTTL = Math.floor((entry.expiresAt - Date.now()) / 1000);
            this.set(key, newValue, remainingTTL > 0 ? remainingTTL : this.defaultTTL);
        } else {
            this.set(key, newValue);
        }

        return newValue;
    }

    startCleanup(intervalMs = 60000) {
        if (this.cleanupInterval) return;

        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.store.entries()) {
                if (now > entry.expiresAt) {
                    this.store.delete(key);
                }
            }
        }, intervalMs);

        this.cleanupInterval.unref();
    }

    stopCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    stats() {
        let totalSize = 0;
        const now = Date.now();
        let validKeys = 0;

        for (const [key, entry] of this.store.entries()) {
            if (now <= entry.expiresAt) {
                validKeys++;
                totalSize += JSON.stringify(entry.value).length * 2;
            }
        }

        return { size: totalSize, keys: validKeys };
    }
}

const cache = new MemoryCache();

function createCache(defaultTTL) {
    return new MemoryCache(defaultTTL);
}

/**
 * Cache decorator for functions
 */
function withCache(fn, keyPrefix, ttl = 3600) {
    return async (...args) => {
        const key = `${keyPrefix}:${JSON.stringify(args)}`;

        const cached = cache.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const result = await fn(...args);
        cache.set(key, result, ttl);

        return result;
    };
}

/**
 * Cache key generator helpers
 */
const cacheKey = {
    entity: (type, id) => `${type}:${id}`,
    list: (type, filters) => {
        const filterStr = filters ? `:${JSON.stringify(filters)}` : '';
        return `${type}:list${filterStr}`;
    },
    user: (userId, type) => `user:${userId}:${type}`,
    custom: (...parts) => parts.join(':'),
};

/**
 * Cache patterns for common use cases
 */
const cachePatterns = {
    async getOrSet(key, fetchFn, ttl = 3600) {
        return cache.getOrSet(key, fetchFn, ttl);
    },

    invalidateOnWrite(keys, writeFn) {
        return writeFn().then(result => {
            const keysToDelete = Array.isArray(keys) ? keys : [keys];
            keysToDelete.forEach(key => cache.delete(key));
            return result;
        });
    },

    invalidateByPrefix(prefix) {
        return cache.deleteByPrefix(prefix);
    },
};

module.exports = {
    cache,
    createCache,
    MemoryCache,
    withCache,
    cacheKey,
    cachePatterns,
};
