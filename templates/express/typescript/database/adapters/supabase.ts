/**
 * Supabase Database Adapter
 * Cloud PostgreSQL with real-time capabilities
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CloudAdapter, DatabaseConfig } from '../types';

export class SupabaseAdapter implements CloudAdapter {
    readonly name = 'supabase';
    readonly type = 'cloud' as const;

    private client: SupabaseClient | null = null;
    private config: DatabaseConfig['supabase'];
    private connected = false;

    constructor(config: DatabaseConfig['supabase']) {
        if (!config?.url || !config?.anonKey) {
            throw new Error('Supabase requires url and anonKey in configuration');
        }
        this.config = config;
    }

    async connect(): Promise<void> {
        if (this.connected) return;

        try {
            this.client = createClient(this.config!.url, this.config!.anonKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            });

            // Test connection
            const { error } = await this.client.from('_health_check').select('*').limit(1).maybeSingle();

            // Ignore table not found errors - connection is still valid
            if (error && !error.message.includes('does not exist')) {
                throw error;
            }

            this.connected = true;
            console.log('✅ Supabase connected');
        } catch (error: any) {
            console.error('❌ Supabase connection failed:', error.message);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            // Supabase client doesn't have explicit disconnect
            this.client = null;
            this.connected = false;
            console.log('🔌 Supabase disconnected');
        }
    }

    isConnected(): boolean {
        return this.connected && this.client !== null;
    }

    getClient<T = SupabaseClient>(): T {
        if (!this.client) {
            throw new Error('Supabase client not initialized. Call connect() first.');
        }
        return this.client as T;
    }

    async healthCheck(): Promise<boolean> {
        try {
            if (!this.client) return false;
            await this.client.from('_health_check').select('*').limit(1).maybeSingle();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Convenience methods for Supabase operations
     */

    from(table: string): ReturnType<SupabaseClient['from']> {
        return this.getClient().from(table);
    }

    get auth(): SupabaseClient['auth'] {
        return this.getClient().auth;
    }

    get storage(): SupabaseClient['storage'] {
        return this.getClient().storage;
    }

    get functions(): SupabaseClient['functions'] {
        return this.getClient().functions;
    }

    channel(name: string): ReturnType<SupabaseClient['channel']> {
        return this.getClient().channel(name);
    }

    rpc(fn: string, params?: Record<string, any>): ReturnType<SupabaseClient['rpc']> {
        return this.getClient().rpc(fn, params);
    }
}

export function createSupabaseAdapter(config: DatabaseConfig['supabase']): SupabaseAdapter {
    return new SupabaseAdapter(config);
}
