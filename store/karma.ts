// =============================================================================
// KARMA SYSTEM — Pure formula functions (TypeScript)
//
// These are the authoritative client-side implementations of every karma rule.
// All actual karma minting happens server-side via Supabase RPC (security
// definer functions). These functions exist for:
//   • Client-side previews ("you will earn +X karma")
//   • Queue display / sorting before the server is queried
//   • Unit-testable documentation of the algorithm
//
// Server-side mirrors live in: supabase/migrations/20260301170000_karma_system.sql
// =============================================================================

// ── Types ────────────────────────────────────────────────────────────────────

export type UtilityLevel = 'high' | 'medium' | 'low';
export type ConditionLevel = 'new' | 'good' | 'worn';
export type ReturnOutcome = 'early' | 'on_time' | 'late' | 'lost_or_damaged';
export type AbusePenaltyReason =
    | 'no_show'
    | 'fake_listing'
    | 'item_damage'
    | 'repeated_cancellation';

export type DonationKarmaInput = {
    estimatedPrice: number;
    utility:        UtilityLevel;
    condition:      ConditionLevel;
    isTriageMode:   boolean;
};

export type ReturnKarmaResult = {
    outcome:          ReturnOutcome;
    karmaDelta:       number;   // positive or negative; applied to borrower
    reliabilityDelta: number;   // applied to borrower's reliability_score
};

export type BorrowPriorityInput = {
    karma:            number;
    reliabilityScore: number;
    activeLoans:      number;
};

export type AbusePenaltyResult = {
    karmaDelta:       number;   // always negative
    reliabilityDelta: number;   // always negative
};

// ── Constants ────────────────────────────────────────────────────────────────

/** Multipliers applied to estimated price based on how broadly useful the item is. */
const UTILITY_FACTORS: Record<UtilityLevel, number> = {
    high:   1.0,
    medium: 0.7,
    low:    0.4,
};

/** Multipliers applied based on the physical condition of the donated item. */
const CONDITION_FACTORS: Record<ConditionLevel, number> = {
    new:  1.0,
    good: 0.7,
    worn: 0.4,
};

/** During Triage / Move-Out mode, donation karma is doubled. */
export const SEASONAL_MULTIPLIER_TRIAGE = 2.0;

/** Borrower karma delta for each return outcome (library vault & hallway). */
const RETURN_KARMA_DELTAS: Record<ReturnOutcome, number> = {
    early:           +3,
    on_time:         +2,
    late:            -3,
    lost_or_damaged: -15,
};

/** Borrower reliability_score delta for each return outcome. Clamped [0.00, 2.00]. */
const RELIABILITY_DELTAS: Record<ReturnOutcome, number> = {
    early:           +0.10,
    on_time:         +0.05,
    late:            -0.10,
    lost_or_damaged: -0.50,
};

/** Karma deducted from the offending user per abuse reason. */
const ABUSE_KARMA_PENALTIES: Record<AbusePenaltyReason, number> = {
    no_show:               -10,
    fake_listing:          -25,
    item_damage:           -15,
    repeated_cancellation:  -5,
};

/** Reliability deducted per abuse reason. */
const ABUSE_RELIABILITY_PENALTIES: Record<AbusePenaltyReason, number> = {
    no_show:               -0.20,
    fake_listing:          -0.30,
    item_damage:           -0.40,
    repeated_cancellation: -0.05,
};

/** Default number of days a borrower has before a loan is considered late. */
export const DEFAULT_LOAN_DAYS = 14;

/** Grace period (ms) before "returned > 1 day early" classification kicks in. */
const EARLY_RETURN_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// ── Helpers ──────────────────────────────────────────────────────────────────

const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

// ── Formula 1: Donation Karma ─────────────────────────────────────────────────

/**
 * computeDonationKarma
 *
 * Called when a user donates an item to the Library (vault) or Triage (feed).
 *
 * Formula:
 *   BaseKarma     = estimatedPrice × utilityFactor × conditionFactor
 *   DonationKarma = round(BaseKarma × seasonalMultiplier)  clamped [5, 100]
 *
 * Examples:
 *   $50 drill, high utility, good condition, normal mode:
 *     50 × 1.0 × 0.7 × 1.0 = 35 karma
 *
 *   $30 lamp, low utility, worn condition, triage mode (×2):
 *     30 × 0.4 × 0.4 × 2.0 = 9.6 → 10 karma
 *
 *   $200 laptop, high utility, new condition, triage mode (×2):
 *     200 × 1.0 × 1.0 × 2.0 = 400 → capped at 100 karma
 */
export function computeDonationKarma(input: DonationKarmaInput): number {
    const { estimatedPrice, utility, condition, isTriageMode } = input;
    const utilityFactor    = UTILITY_FACTORS[utility];
    const conditionFactor  = CONDITION_FACTORS[condition];
    const seasonalMult     = isTriageMode ? SEASONAL_MULTIPLIER_TRIAGE : 1.0;
    const baseKarma        = estimatedPrice * utilityFactor * conditionFactor;
    return clamp(Math.round(baseKarma * seasonalMult), 5, 100);
}

// ── Formula 2: Borrower Reliability Karma (on return) ────────────────────────

/**
 * computeReturnKarma
 *
 * Called when a borrower returns an item (Library vault or hallway QR transfer).
 * Compares actual return time against the due date to classify the return.
 */
export function computeReturnKarma(
    returnedAt: Date,
    dueDate:    Date | null,
): ReturnKarmaResult {
    let outcome: ReturnOutcome;

    if (dueDate === null) {
        outcome = 'on_time';
    } else if (returnedAt < new Date(dueDate.getTime() - EARLY_RETURN_THRESHOLD_MS)) {
        outcome = 'early';
    } else if (returnedAt <= dueDate) {
        outcome = 'on_time';
    } else {
        outcome = 'late';
    }

    return {
        outcome,
        karmaDelta:       RETURN_KARMA_DELTAS[outcome],
        reliabilityDelta: RELIABILITY_DELTAS[outcome],
    };
}

// ── Formula 3: Lifetime Item Impact Bonus ────────────────────────────────────

/**
 * computeLifetimeBonus
 *
 * Awarded to the original donor each time their Library item is successfully
 * returned by a borrower. Grows logarithmically so early borrows matter most.
 *
 * Formula:
 *   LifetimeBonus = max(1, floor(log₂(successfulBorrows + 1)))
 */
export function computeLifetimeBonus(successfulBorrows: number): number {
    return Math.max(1, Math.floor(Math.log2(successfulBorrows + 1)));
}

// ── Formula 4: Seasonal Multiplier ───────────────────────────────────────────

/**
 * applySeasonalMultiplier
 *
 * During Triage / Move-Out mode, donation karma is multiplied by 2.0.
 */
export function applySeasonalMultiplier(baseKarma: number, isTriageMode: boolean): number {
    const mult = isTriageMode ? SEASONAL_MULTIPLIER_TRIAGE : 1.0;
    return clamp(Math.round(baseKarma * mult), 5, 100);
}

// ── Formula 5: Borrow Priority Queue ─────────────────────────────────────────

/**
 * computeBorrowPriority
 *
 * Ranks competing borrow requests for the same Library item.
 * Higher score = higher position in the queue.
 *
 * Formula:
 *   BorrowPriority = (max(karma, 1) ^ 0.7) × reliabilityScore / (activeLoans + 1)
 */
export function computeBorrowPriority(input: BorrowPriorityInput): number {
    const { karma, reliabilityScore, activeLoans } = input;
    const karmaBase = Math.max(karma, 1);
    return (Math.pow(karmaBase, 0.7) * reliabilityScore) / (activeLoans + 1);
}

/**
 * sortByBorrowPriority
 *
 * Convenience helper: given an array of borrow candidates, returns them
 * sorted by priority descending (highest priority first).
 */
export function sortByBorrowPriority<T extends BorrowPriorityInput>(
    candidates: T[]
): T[] {
    return [...candidates].sort(
        (a, b) => computeBorrowPriority(b) - computeBorrowPriority(a)
    );
}

// ── Formula 6: Abuse Penalties ───────────────────────────────────────────────

/**
 * computeAbusePenalty
 *
 * Returns the karma and reliability deductions for a given abuse violation.
 */
export function computeAbusePenalty(reason: AbusePenaltyReason): AbusePenaltyResult {
    return {
        karmaDelta:       ABUSE_KARMA_PENALTIES[reason],
        reliabilityDelta: ABUSE_RELIABILITY_PENALTIES[reason],
    };
}

// ── Utility: derive return outcome from ISO date strings ─────────────────────

/**
 * deriveReturnOutcome
 *
 * Convenience wrapper for display logic: accepts ISO date strings
 * (as stored in the DB) and returns the return outcome label.
 */
export function deriveReturnOutcome(
    returnedAtISO: string,
    dueDateISO:    string | null,
): ReturnOutcome {
    const { outcome } = computeReturnKarma(
        new Date(returnedAtISO),
        dueDateISO ? new Date(dueDateISO) : null,
    );
    return outcome;
}

// ── Reliability score helpers ─────────────────────────────────────────────────

/** Clamp a reliability score to the valid [0.00, 2.00] range. */
export const clampReliability = (score: number): number => clamp(score, 0.0, 2.0);

/** Clamp a karma value to the valid [0, ∞) range (karma never goes negative). */
export const clampKarma = (karma: number): number => Math.max(0, karma);
