import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigError = isSupabaseConfigured
    ? null
    : 'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.';

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = () => {
    if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Supabase environment variables are missing. Define EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
        );
    }

    if (!supabaseClient) {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: false,
                detectSessionInUrl: false,
            },
        });
    }

    return supabaseClient;
};
