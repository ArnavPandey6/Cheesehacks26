import { create } from 'zustand';
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';

import { getSupabaseClient, isSupabaseConfigured, supabaseConfigError } from '@/store/supabaseClient';

export type User = {
    id: string;
    name: string;
    apartment: string;
    unit: string;
    email: string;
    karma: number;
    createdAt: string;
};

export type VaultItem = {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    status: 'available' | 'reserved' | 'on-loan';
    minKarmaRequired: number;
    reservedByUserId?: string | null;
};

export type FeedOfferState = 'open' | 'claimed' | 'returned';

export type FeedPost = {
    id: string;
    authorUserId: string;
    authorName: string;
    content: string;
    timestamp: string;
    isOffer: boolean;
    imageUrl?: string;
    offerState: FeedOfferState;
    claimedByUserId?: string | null;
    claimedByName?: string | null;
    claimedAt?: string | null;
    returnedAt?: string | null;
};

export type FeedPostInput = {
    content: string;
    isOffer: boolean;
    imageUrl?: string;
};

export type SignInInput = {
    email: string;
    password: string;
};

export type SignUpInput = {
    name: string;
    apartment: string;
    unit: string;
    email: string;
    password: string;
};

export type ActionResult =
    | { ok: true }
    | { ok: false; reason: string };

export type AuthResult =
    | { ok: true; user: User | null }
    | { ok: false; reason: string };

export type HallwayReturnCodeResult =
    | { ok: true; code: string }
    | { ok: false; reason: string };

type RawProfileRow = {
    id: string;
    name: string;
    apartment: string;
    unit: string;
    email: string;
    karma: number;
    created_at: string;
};

type RawVaultItemRow = {
    id: string;
    name: string;
    description: string;
    image_url: string;
    status: 'available' | 'reserved' | 'on-loan';
    min_karma_required: number;
    reserved_by_user_id: string | null;
    created_at: string;
};

type RawFeedPostRow = {
    id: string;
    author_user_id: string;
    content: string;
    is_offer: boolean;
    image_url: string | null;
    offer_state: FeedOfferState;
    claimed_by_user_id: string | null;
    claimed_at: string | null;
    returned_at: string | null;
    created_at: string;
};

interface AppState {
    hasHydrated: boolean;
    backendConfigured: boolean;
    backendError: string | null;
    sessionUserId: string | null;
    users: User[];
    currentUser: User | null;
    vaultItems: VaultItem[];
    feedPosts: FeedPost[];
    initialize: () => Promise<void>;
    refreshAllData: () => Promise<ActionResult>;
    signUp: (input: SignUpInput) => Promise<AuthResult>;
    signIn: (input: SignInInput) => Promise<AuthResult>;
    signOut: () => Promise<void>;
    addKarma: (amount: number) => Promise<ActionResult>;
    reserveItem: (itemId: string) => Promise<ActionResult>;
    returnItem: (itemId: string) => Promise<ActionResult>;
    addFeedPost: (post: FeedPostInput) => Promise<FeedPost | null>;
    claimFeedOffer: (postId: string) => Promise<ActionResult>;
    createHallwayReturnCode: (postId: string) => Promise<HallwayReturnCodeResult>;
    markFeedOfferReturned: (postId: string, returnToken: string) => Promise<ActionResult>;
    adoptItemToVault: (item: VaultItem) => Promise<ActionResult>;
}

const normalizeEmail = (value: string) => value.trim();
const SUPABASE_MISSING_MESSAGE =
    supabaseConfigError ?? 'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.';
const IMAGE_BUCKET = 'relay-images';

const normalizeImageUrl = (value: string | null | undefined) => {
    const candidate = value?.trim();
    if (!candidate) return undefined;
    if (/^https?:\/\//i.test(candidate)) return candidate;
    if (!isSupabaseConfigured) return candidate;

    try {
        const { data } = getSupabaseClient().storage.from(IMAGE_BUCKET).getPublicUrl(candidate);
        return data.publicUrl;
    } catch {
        return candidate;
    }
};

const mapProfileRow = (row: RawProfileRow): User => ({
    id: row.id,
    name: row.name,
    apartment: row.apartment,
    unit: row.unit,
    email: row.email,
    karma: row.karma,
    createdAt: row.created_at,
});

const mapVaultRow = (row: RawVaultItemRow): VaultItem => ({
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: normalizeImageUrl(row.image_url) ?? row.image_url,
    status: row.status,
    minKarmaRequired: row.min_karma_required,
    reservedByUserId: row.reserved_by_user_id,
});

const mapFeedRow = (row: RawFeedPostRow, profilesById: Record<string, User>): FeedPost => ({
    id: row.id,
    authorUserId: row.author_user_id,
    authorName: profilesById[row.author_user_id]?.name ?? 'Unknown',
    content: row.content,
    timestamp: row.created_at,
    isOffer: row.is_offer,
    imageUrl: normalizeImageUrl(row.image_url),
    offerState: row.offer_state,
    claimedByUserId: row.claimed_by_user_id,
    claimedByName: row.claimed_by_user_id ? profilesById[row.claimed_by_user_id]?.name ?? 'Neighbor' : null,
    claimedAt: row.claimed_at,
    returnedAt: row.returned_at,
});

const getFriendlyErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
        const maybeMessage = (error as { message?: unknown }).message;
        if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
    }
    return 'Unexpected error. Please try again.';
};

const isRemoteImageUrl = (value: string) => /^https?:\/\//i.test(value);

const getFileExtension = (value: string) => {
    const cleanValue = value.split('?')[0].split('#')[0];
    const match = cleanValue.match(/\.([a-zA-Z0-9]+)$/);
    return match?.[1]?.toLowerCase() || 'jpg';
};

const getMimeType = (extension: string) => {
    switch (extension) {
        case 'png':
            return 'image/png';
        case 'webp':
            return 'image/webp';
        case 'heic':
            return 'image/heic';
        case 'jpeg':
        case 'jpg':
        default:
            return 'image/jpeg';
    }
};

const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

const uploadImageIfNeeded = async (rawUri: string | undefined, userId: string) => {
    if (!rawUri) return undefined;
    const uri = rawUri.trim();
    if (!uri) return undefined;
    if (isRemoteImageUrl(uri)) return uri;

    const supabase = getSupabaseClient();

    // Accept base64 data URIs (data:image/jpeg;base64,...) — the most reliable
    // way to get image data from expo-image-picker without reading local file URIs.
    if (uri.startsWith('data:')) {
        const commaIdx = uri.indexOf(',');
        const header = uri.slice(0, commaIdx);
        const base64Data = uri.slice(commaIdx + 1);
        const mimeType = header.split(':')[1]?.split(';')[0] ?? 'image/jpeg';
        const extension = mimeType.split('/')[1] ?? 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
        const storagePath = `${userId}/${fileName}`;
        const bytes = base64ToUint8Array(base64Data);

        const { data, error } = await supabase.storage
            .from(IMAGE_BUCKET)
            .upload(storagePath, bytes, { contentType: mimeType, upsert: false });

        if (error) throw error;
        const { data: publicUrlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(data.path);
        return publicUrlData.publicUrl;
    }

    // Fallback: XHR for local file:// URIs (used by triage screen)
    const extension = getFileExtension(uri);
    const mimeType = getMimeType(extension);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', uri, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => resolve(xhr.response as ArrayBuffer);
        xhr.onerror = () => reject(new Error('Unable to read selected image for upload.'));
        xhr.send();
    });
    const storagePath = `${userId}/${fileName}`;

    const { data, error } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(storagePath, arrayBuffer, { contentType: mimeType, upsert: false });

    if (error) throw error;
    const { data: publicUrlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(data.path);
    return publicUrlData.publicUrl;
};

const ensureProfileExists = async (
    authUser: SupabaseAuthUser,
    fallbackName?: string,
    fallbackApartment?: string,
    fallbackUnit?: string
) => {
    const supabase = getSupabaseClient();

    const email = authUser.email?.trim() ?? `missing-email-${authUser.id}`;
    const name = fallbackName?.trim() || (typeof authUser.user_metadata?.name === 'string' ? authUser.user_metadata.name : email.split('@')[0] || 'Neighbor');
    const apartment = fallbackApartment?.trim()
        || (typeof authUser.user_metadata?.apartment === 'string' ? authUser.user_metadata.apartment : 'Unknown');
    const unit = fallbackUnit?.trim()
        || (typeof authUser.user_metadata?.unit === 'string' ? authUser.user_metadata.unit : 'Unknown');

    const upsertPayload = {
        id: authUser.id,
        name,
        apartment,
        unit,
        email,
    };

    const { error } = await supabase.from('profiles').upsert(upsertPayload, {
        onConflict: 'id',
        ignoreDuplicates: false,
    });

    if (error) throw error;
};

const loadAllDataFromSupabase = async (sessionUserId: string | null) => {
    const supabase = getSupabaseClient();

    const [profilesResult, vaultItemsResult, feedPostsResult] = await Promise.all([
        supabase
            .from('profiles')
            .select('id,name,apartment,unit,email,karma,created_at')
            .order('created_at', { ascending: true }),
        supabase
            .from('vault_items')
            .select('id,name,description,image_url,status,min_karma_required,reserved_by_user_id,created_at')
            .order('created_at', { ascending: false }),
        supabase
            .from('feed_posts')
            .select('id,author_user_id,content,is_offer,image_url,offer_state,claimed_by_user_id,claimed_at,returned_at,created_at')
            .order('created_at', { ascending: false }),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (vaultItemsResult.error) throw vaultItemsResult.error;
    if (feedPostsResult.error) throw feedPostsResult.error;

    const users = ((profilesResult.data ?? []) as RawProfileRow[]).map(mapProfileRow);
    const profilesById = users.reduce<Record<string, User>>((accumulator, user) => {
        accumulator[user.id] = user;
        return accumulator;
    }, {});

    const currentUser = sessionUserId ? profilesById[sessionUserId] ?? null : null;
    const vaultItems = ((vaultItemsResult.data ?? []) as RawVaultItemRow[]).map(mapVaultRow);
    const feedPosts = ((feedPostsResult.data ?? []) as RawFeedPostRow[]).map((row) => mapFeedRow(row, profilesById));

    return { users, currentUser, vaultItems, feedPosts };
};

let hasAuthListener = false;
let hasRealtimeListener = false;
let realtimeRefreshTimer: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<AppState>((set, get) => ({
    hasHydrated: false,
    backendConfigured: isSupabaseConfigured,
    backendError: isSupabaseConfigured ? null : SUPABASE_MISSING_MESSAGE,
    sessionUserId: null,
    users: [],
    currentUser: null,
    vaultItems: [],
    feedPosts: [],

    initialize: async () => {
        if (get().hasHydrated) return;

        if (!isSupabaseConfigured) {
            set({
                hasHydrated: true,
                backendConfigured: false,
                backendError: SUPABASE_MISSING_MESSAGE,
                sessionUserId: null,
                users: [],
                currentUser: null,
                vaultItems: [],
                feedPosts: [],
            });
            return;
        }

        try {
            const supabase = getSupabaseClient();
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;

            const session = sessionData.session;
            const sessionUserId = session?.user?.id ?? null;

            set({ sessionUserId });
            await get().refreshAllData();

            if (!hasAuthListener) {
                hasAuthListener = true;
                supabase.auth.onAuthStateChange((_event, nextSession: Session | null) => {
                    const nextSessionUserId = nextSession?.user?.id ?? null;
                    set({ sessionUserId: nextSessionUserId });
                    void get().refreshAllData();
                });
            }

            if (!hasRealtimeListener) {
                hasRealtimeListener = true;
                const scheduleRefresh = () => {
                    if (realtimeRefreshTimer) return;
                    realtimeRefreshTimer = setTimeout(() => {
                        realtimeRefreshTimer = null;
                        void get().refreshAllData();
                    }, 250);
                };

                supabase
                    .channel('relay-live-sync')
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'profiles' },
                        scheduleRefresh
                    )
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'vault_items' },
                        scheduleRefresh
                    )
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'feed_posts' },
                        scheduleRefresh
                    )
                    .subscribe();
            }

            set({ hasHydrated: true });
        } catch (error) {
            const reason = getFriendlyErrorMessage(error);
            set({
                hasHydrated: true,
                backendConfigured: false,
                backendError: reason,
                sessionUserId: null,
                users: [],
                currentUser: null,
                vaultItems: [],
                feedPosts: [],
            });
        }
    },

    refreshAllData: async () => {
        if (!isSupabaseConfigured) {
            set({ backendConfigured: false, backendError: SUPABASE_MISSING_MESSAGE });
            return { ok: false, reason: SUPABASE_MISSING_MESSAGE };
        }

        if (!get().sessionUserId) {
            set({
                backendConfigured: true,
                backendError: null,
                users: [],
                currentUser: null,
                vaultItems: [],
                feedPosts: [],
            });
            return { ok: true };
        }

        try {
            const data = await loadAllDataFromSupabase(get().sessionUserId);
            set({
                backendConfigured: true,
                backendError: null,
                users: data.users,
                currentUser: data.currentUser,
                vaultItems: data.vaultItems,
                feedPosts: data.feedPosts,
            });
            return { ok: true };
        } catch (error) {
            const reason = getFriendlyErrorMessage(error);
            set({ backendError: reason });
            return { ok: false, reason };
        }
    },

    signUp: async (input: SignUpInput) => {
        if (!isSupabaseConfigured) return { ok: false, reason: SUPABASE_MISSING_MESSAGE };

        const name = input.name.trim();
        const apartment = input.apartment.trim();
        const unitInput = input.unit.trim();
        const email = normalizeEmail(input.email);
        const password = input.password;

        if (name.length < 2) return { ok: false, reason: 'Name must be at least 2 characters.' };
        if (!email) return { ok: false, reason: 'Email is required.' };
        if (!apartment) return { ok: false, reason: 'Apartment is required.' };
        if (!unitInput) return { ok: false, reason: 'Unit is required.' };
        if (password.length < 6) return { ok: false, reason: 'Password must be at least 6 characters.' };

        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, apartment, unit: unitInput },
            },
        });

        if (error) {
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes('rate limit')) {
                return {
                    ok: false,
                    reason: 'Signup is temporarily rate-limited by Supabase. Disable email confirmation in Supabase Auth settings for MVP, or wait briefly and retry.',
                };
            }
            return { ok: false, reason: error.message };
        }
        if (!data.user) return { ok: false, reason: 'Unable to create account.' };

        let activeSessionUser = data.session?.user ?? null;
        if (!activeSessionUser) {
            const signInResult = await supabase.auth.signInWithPassword({ email, password });
            if (signInResult.error) {
                const isEmailConfirmFlow = signInResult.error.message.toLowerCase().includes('email not confirmed');
                return {
                    ok: false,
                    reason: isEmailConfirmFlow
                        ? 'Account created. Check your email to confirm your account, then sign in.'
                        : `Account created but auto sign-in failed: ${signInResult.error.message}`,
                };
            }

            activeSessionUser = signInResult.data.session?.user ?? null;
        }

        if (!activeSessionUser) {
            return { ok: false, reason: 'Account created, but no session is active yet. Please sign in.' };
        }

        try {
            await ensureProfileExists(activeSessionUser, name, apartment, unitInput);
        } catch (profileError) {
            return { ok: false, reason: getFriendlyErrorMessage(profileError) };
        }

        set({ sessionUserId: activeSessionUser.id });
        const refreshed = await get().refreshAllData();
        if (!refreshed.ok) return { ok: false, reason: refreshed.reason };

        return { ok: true, user: get().currentUser };
    },

    signIn: async (input: SignInInput) => {
        if (!isSupabaseConfigured) return { ok: false, reason: SUPABASE_MISSING_MESSAGE };

        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizeEmail(input.email),
            password: input.password,
        });

        if (error) return { ok: false, reason: error.message };
        if (!data.session) return { ok: false, reason: 'No session created. Please try again.' };

        try {
            await ensureProfileExists(data.session.user);
        } catch (profileError) {
            return { ok: false, reason: getFriendlyErrorMessage(profileError) };
        }

        set({ sessionUserId: data.session.user.id });
        const refreshed = await get().refreshAllData();
        if (!refreshed.ok) return { ok: false, reason: refreshed.reason };

        return { ok: true, user: get().currentUser };
    },

    signOut: async () => {
        if (!isSupabaseConfigured) {
            set({ sessionUserId: null, currentUser: null });
            return;
        }

        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
        set({
            sessionUserId: null,
            currentUser: null,
            vaultItems: [],
            feedPosts: [],
        });
    },

    addKarma: async (amount: number) => {
        if (!isSupabaseConfigured) return { ok: false, reason: SUPABASE_MISSING_MESSAGE };
        if (!get().currentUser) return { ok: false, reason: 'Please sign in first.' };
        if (amount === 0) return { ok: true };

        const supabase = getSupabaseClient();
        const { error } = await supabase.rpc('adjust_user_karma', {
            p_delta: amount,
        });

        if (error) return { ok: false, reason: error.message };
        await get().refreshAllData();
        return { ok: true };
    },

    reserveItem: async (itemId: string) => {
        if (!isSupabaseConfigured) return { ok: false, reason: SUPABASE_MISSING_MESSAGE };
        if (!get().currentUser) return { ok: false, reason: 'Please sign in first.' };

        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc('reserve_vault_item', {
            p_item_id: itemId,
        });

        if (error) return { ok: false, reason: error.message };
        if (!data) return { ok: false, reason: 'Item is unavailable or your karma is too low.' };

        await get().refreshAllData();
        return { ok: true };
    },

    returnItem: async (itemId: string) => {
        if (!isSupabaseConfigured) return { ok: false, reason: SUPABASE_MISSING_MESSAGE };
        if (!get().currentUser) return { ok: false, reason: 'Please sign in first.' };

        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc('return_vault_item', {
            p_item_id: itemId,
        });

        if (error) return { ok: false, reason: error.message };
        if (!data) return { ok: false, reason: 'This item is not checked out by your account.' };

        await get().refreshAllData();
        return { ok: true };
    },

    addFeedPost: async (post: FeedPostInput) => {
        if (!isSupabaseConfigured) return null;
        const currentUser = get().currentUser;
        if (!currentUser) return null;

        const content = post.content.trim();
        if (!content) return null;

        let uploadedImageUrl: string | undefined;
        try {
            uploadedImageUrl = await uploadImageIfNeeded(post.imageUrl, currentUser.id);
        } catch (uploadError) {
            set({ backendError: getFriendlyErrorMessage(uploadError) });
            return null;
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase.from('feed_posts').insert({
            author_user_id: currentUser.id,
            content,
            is_offer: post.isOffer,
            image_url: uploadedImageUrl ?? null,
            offer_state: 'open',
        });

        if (error) {
            set({ backendError: error.message });
            return null;
        }

        await get().refreshAllData();
        const created = get().feedPosts[0] ?? null;
        return created;
    },

    claimFeedOffer: async (postId: string) => {
        if (!isSupabaseConfigured) return { ok: false, reason: SUPABASE_MISSING_MESSAGE };
        if (!get().currentUser) return { ok: false, reason: 'Please sign in first.' };

        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc('claim_feed_offer', {
            p_post_id: postId,
        });

        if (error) return { ok: false, reason: error.message };
        if (!data) return { ok: false, reason: 'Offer is unavailable or cannot be claimed.' };

        await get().refreshAllData();
        return { ok: true };
    },

    createHallwayReturnCode: async (postId: string) => {
        if (!isSupabaseConfigured) return { ok: false, reason: SUPABASE_MISSING_MESSAGE };
        if (!get().currentUser) return { ok: false, reason: 'Please sign in first.' };

        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc('create_hallway_return_token', {
            p_post_id: postId,
        });

        if (error) return { ok: false, reason: error.message };
        if (typeof data !== 'string' || !data.trim()) {
            return { ok: false, reason: 'Unable to generate a hallway return QR token right now.' };
        }

        return { ok: true, code: data };
    },

    markFeedOfferReturned: async (postId: string, returnToken: string) => {
        if (!isSupabaseConfigured) return { ok: false, reason: SUPABASE_MISSING_MESSAGE };
        if (!get().currentUser) return { ok: false, reason: 'Please sign in first.' };

        const token = returnToken.trim();
        if (!token) return { ok: false, reason: 'Return token is required.' };

        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc('complete_hallway_return', {
            p_post_id: postId,
            p_token: token,
        });

        if (error) return { ok: false, reason: error.message };
        if (!data) {
            return { ok: false, reason: 'This transfer is not currently checked out by your account.' };
        }

        await get().refreshAllData();
        return { ok: true };
    },

    adoptItemToVault: async (item: VaultItem) => {
        if (!isSupabaseConfigured) return { ok: false, reason: SUPABASE_MISSING_MESSAGE };
        const currentUser = get().currentUser;
        if (!currentUser) return { ok: false, reason: 'Please sign in first.' };

        let uploadedImageUrl: string;
        try {
            uploadedImageUrl = (await uploadImageIfNeeded(item.imageUrl, currentUser.id)) ?? '';
        } catch (error) {
            return { ok: false, reason: getFriendlyErrorMessage(error) };
        }

        if (!uploadedImageUrl) return { ok: false, reason: 'Image upload failed. Please try again.' };

        const supabase = getSupabaseClient();
        const { error } = await supabase.from('vault_items').insert({
            name: item.name,
            description: item.description,
            image_url: uploadedImageUrl,
            status: 'available',
            min_karma_required: item.minKarmaRequired,
            created_by_user_id: currentUser.id,
        });

        if (error) return { ok: false, reason: error.message };
        await get().refreshAllData();
        return { ok: true };
    },
}));
