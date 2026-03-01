const RETURN_QR_PREFIX = 'relay-return-v1';
const RETURN_QR_SECRET = 'relay-hub-shared-secret-v1';
const MAX_CLOCK_SKEW_MS = 60_000;

const hash32 = (value: string) => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
};

const signBody = (body: string) => hash32(`${body}|${RETURN_QR_SECRET}`);

const safeEquals = (left: string, right: string) => {
    if (left.length !== right.length) return false;
    let mismatch = 0;
    for (let i = 0; i < left.length; i += 1) {
        mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
    }
    return mismatch === 0;
};

const parsePositiveInt = (value: string) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
};

export const createHubReturnPayload = (itemId: string, issuedAt = Date.now(), ttlMs = 5 * 60 * 1000) => {
    const expiresAt = issuedAt + ttlMs;
    const body = `${RETURN_QR_PREFIX}|${itemId}|${issuedAt}|${expiresAt}`;
    return `${body}|${signBody(body)}`;
};

export type ReturnQrValidationResult =
    | { ok: true }
    | { ok: false; reason: string };

export const validateHubReturnPayload = (
    payload: string,
    expectedItemId: string,
    now = Date.now()
): ReturnQrValidationResult => {
    const trimmedPayload = payload.trim();
    if (!trimmedPayload) {
        return { ok: false, reason: 'QR payload was empty.' };
    }

    const parts = trimmedPayload.split('|');
    if (parts.length !== 5) {
        return { ok: false, reason: 'QR format is invalid.' };
    }

    const [prefix, itemId, issuedAtRaw, expiresAtRaw, signature] = parts;
    if (prefix !== RETURN_QR_PREFIX) {
        return { ok: false, reason: 'QR prefix is invalid.' };
    }
    if (itemId !== expectedItemId) {
        return { ok: false, reason: 'QR code does not match this item.' };
    }

    const issuedAt = parsePositiveInt(issuedAtRaw);
    const expiresAt = parsePositiveInt(expiresAtRaw);
    if (issuedAt === null || expiresAt === null) {
        return { ok: false, reason: 'QR timestamps are invalid.' };
    }
    if (expiresAt <= issuedAt) {
        return { ok: false, reason: 'QR expiration is invalid.' };
    }
    if (issuedAt > now + MAX_CLOCK_SKEW_MS) {
        return { ok: false, reason: 'QR issue time is in the future.' };
    }
    if (now > expiresAt) {
        return { ok: false, reason: 'QR code has expired.' };
    }

    const body = `${prefix}|${itemId}|${issuedAt}|${expiresAt}`;
    const expectedSignature = signBody(body);
    if (!safeEquals(signature, expectedSignature)) {
        return { ok: false, reason: 'QR signature check failed.' };
    }

    return { ok: true };
};
