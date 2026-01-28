/**
 * Supabase Database Adapter
 * Cloud PostgreSQL with real-time capabilities
 */

const { createClient } = require('@supabase/supabase-js');

class SupabaseAdapter {
    name = 'supabase';
    type = 'cloud';

    /** @type {import('@supabase/supabase-js').SupabaseClient | null} */
    client = null;
    config;
    connected = false;

    /**
     * @param {Object} config
     * @param {string} config.url
     * @param {string} config.anonKey
     * @param {string} [config.serviceRoleKey]
     */
    constructor(config) {
        if (!config?.url || !config?.anonKey) {
            throw new Error('Supabase requires url and anonKey in configuration');
        }
        this.config = config;
    }

    async connect() {
        if (this.connected) return;

        try {
            this.client = createClient(this.config.url, this.config.anonKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            });

            const { error } = await this.client.from('_health_check').select('*').limit(1).maybeSingle();

            if (error && !error.message.includes('does not exist')) {
                throw error;
            }

            this.connected = true;
            console.log('✅ Supabase connected');
        } catch (error) {
            console.error('❌ Supabase connection failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            this.client = null;
            this.connected = false;
            console.log('🔌 Supabase disconnected');
        }
    }

    isConnected() {
        return this.connected && this.client !== null;
    }

    getClient() {
        if (!this.client) {
            throw new Error('Supabase client not initialized. Call connect() first.');
        }
        return this.client;
    }

    async healthCheck() {
        try {
            if (!this.client) return false;
            await this.client.from('_health_check').select('*').limit(1).maybeSingle();
            return true;
        } catch {
            return false;
        }
    }

    from(table) {
        return this.getClient().from(table);
    }

    auth() {
        return this.getClient().auth;
    }

    storage() {
        return this.getClient().storage;
    }

    functions() {
        return this.getClient().functions;
    }

    channel(name) {
        return this.getClient().channel(name);
    }

    rpc(fn, params) {
        return this.getClient().rpc(fn, params);
    }
}

function createSupabaseAdapter(config) {
    return new SupabaseAdapter(config);
}

module.exports = { SupabaseAdapter, createSupabaseAdapter };
