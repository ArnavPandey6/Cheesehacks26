-- =============================================================================
-- KARMA SYSTEM MIGRATION
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE throughout.
-- =============================================================================

-- --------------------------------------------------------------------------
-- 1. SCHEMA ADDITIONS
-- ---------------------------------------------------------------------------

-- profiles: reliability score (0.00 – 2.00) and active loan count
alter table public.profiles
    add column if not exists reliability_score numeric(5,2) not null default 1.00,
    add column if not exists active_loans      integer      not null default 0;

-- vault_items: donation metadata + borrow tracking
alter table public.vault_items
    add column if not exists estimated_price   numeric(10,2) not null default 0.00,
    add column if not exists utility_level     text          not null default 'medium',
    add column if not exists condition_level   text          not null default 'good',
    add column if not exists successful_borrows integer      not null default 0,
    add column if not exists due_date          timestamptz   null;

-- Add check constraints only when absent (safe-to-rerun guard)
do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'vault_utility_level_check'
          and conrelid = 'public.vault_items'::regclass
    ) then
        alter table public.vault_items
            add constraint vault_utility_level_check
            check (utility_level in ('high', 'medium', 'low'));
    end if;

    if not exists (
        select 1 from pg_constraint
        where conname = 'vault_condition_level_check'
          and conrelid = 'public.vault_items'::regclass
    ) then
        alter table public.vault_items
            add constraint vault_condition_level_check
            check (condition_level in ('new', 'good', 'worn'));
    end if;
end;
$$;

-- feed_posts: expected return date + idempotency flag
alter table public.feed_posts
    add column if not exists due_date     timestamptz null,
    add column if not exists karma_minted boolean     not null default false;

-- ---------------------------------------------------------------------------
-- 2. KARMA EVENTS AUDIT LOG
-- ---------------------------------------------------------------------------
-- Every karma change is recorded here for trust verification and auditing.

create table if not exists public.karma_events (
    id         uuid        primary key default gen_random_uuid(),
    user_id    uuid        not null references public.profiles(id) on delete cascade,
    delta      integer     not null,
    reason     text        not null, -- 'donation' | 'return_early' | 'return_on_time' | 'return_late' |
                                     -- 'return_lost_or_damaged' | 'lifetime_impact_bonus' |
                                     -- 'owner_return_complete' | 'abuse_no_show' | 'abuse_fake_listing' |
                                     -- 'abuse_item_damage' | 'abuse_repeated_cancellation'
    ref_id     uuid        null,     -- the vault_item_id or feed_post_id that triggered this
    created_at timestamptz not null default now()
);

alter table public.karma_events enable row level security;

drop policy if exists karma_events_own_select on public.karma_events;
create policy karma_events_own_select on public.karma_events
    for select to authenticated
    using (user_id = auth.uid());

create index if not exists idx_karma_events_user
    on public.karma_events(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. UPDATED FUNCTION: reserve_vault_item
--    Sets due_date on reservation and increments active_loans for borrower.
-- ---------------------------------------------------------------------------
drop function if exists public.reserve_vault_item(uuid);

create or replace function public.reserve_vault_item(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id    uuid;
    v_user_karma integer;
begin
    v_user_id := auth.uid();
    if v_user_id is null then return false; end if;

    select karma into v_user_karma
    from public.profiles
    where id = v_user_id;

    if v_user_karma is null then return false; end if;

    update public.vault_items
    set status              = 'reserved',
        reserved_by_user_id = v_user_id,
        due_date            = now() + interval '14 days'
    where id = p_item_id
      and status = 'available'
      and min_karma_required <= v_user_karma;

    if not found then return false; end if;

    -- Track active loans for borrow-priority queue
    update public.profiles
    set active_loans = active_loans + 1
    where id = v_user_id;

    return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. UPDATED FUNCTION: return_vault_item
--    Full return karma logic: timing-based delta, reliability update, donor
--    lifetime impact bonus, and active_loans decrement.
-- ---------------------------------------------------------------------------
drop function if exists public.return_vault_item(uuid);

create or replace function public.return_vault_item(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_borrower_id       uuid;
    v_donor_id          uuid;
    v_due_date          timestamptz;
    v_return_outcome    text;
    v_karma_delta       integer;
    v_reliability_delta numeric;
    v_new_borrows       integer;
    v_lifetime_bonus    integer;
begin
    v_borrower_id := auth.uid();
    if v_borrower_id is null then return false; end if;

    -- Fetch item; validate borrower owns this reservation
    select created_by_user_id, due_date
    into   v_donor_id, v_due_date
    from   public.vault_items
    where  id = p_item_id
      and  reserved_by_user_id = v_borrower_id
      and  status <> 'available';

    if not found then return false; end if;

    -- Return the item and increment successful_borrows atomically
    update public.vault_items
    set status              = 'available',
        reserved_by_user_id = null,
        due_date            = null,
        successful_borrows  = successful_borrows + 1
    where id = p_item_id
      and reserved_by_user_id = v_borrower_id;

    -- Read new borrow count for lifetime bonus calculation
    select successful_borrows into v_new_borrows
    from   public.vault_items
    where  id = p_item_id;

    -- ── Return timing classification ──────────────────────────────────────
    -- early   : returned > 1 day before due date  → reward
    -- on_time : returned on or before due date     → small reward
    -- late    : returned after due date            → penalty
    if v_due_date is null then
        v_return_outcome    := 'on_time';
    elsif now() < (v_due_date - interval '1 day') then
        v_return_outcome    := 'early';
    elsif now() <= v_due_date then
        v_return_outcome    := 'on_time';
    else
        v_return_outcome    := 'late';
    end if;

    case v_return_outcome
        when 'early'   then v_karma_delta := 3;  v_reliability_delta := 0.10;
        when 'on_time' then v_karma_delta := 2;  v_reliability_delta := 0.05;
        else                v_karma_delta := -3; v_reliability_delta := -0.10; -- late
    end case;

    -- ── Borrower: karma + reliability + active_loans ──────────────────────
    update public.profiles
    set karma           = greatest(0, karma + v_karma_delta),
        reliability_score = greatest(0.00, least(2.00, reliability_score + v_reliability_delta)),
        active_loans    = greatest(0, active_loans - 1)
    where id = v_borrower_id;

    insert into public.karma_events (user_id, delta, reason, ref_id)
    values (v_borrower_id, v_karma_delta, 'return_' || v_return_outcome, p_item_id);

    -- ── Donor: lifetime impact bonus = floor(log2(successful_borrows + 1)) ─
    -- Minimum 1 point per successful return, grows logarithmically.
    if v_donor_id is not null and v_donor_id <> v_borrower_id then
        v_lifetime_bonus := greatest(1, floor(ln(v_new_borrows + 1) / ln(2))::integer);

        update public.profiles
        set karma = karma + v_lifetime_bonus
        where id = v_donor_id;

        insert into public.karma_events (user_id, delta, reason, ref_id)
        values (v_donor_id, v_lifetime_bonus, 'lifetime_impact_bonus', p_item_id);
    end if;

    return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. UPDATED FUNCTION: claim_feed_offer
--    Sets a 14-day due_date on claim and increments borrower's active_loans.
-- ---------------------------------------------------------------------------
drop function if exists public.claim_feed_offer(uuid);

create or replace function public.claim_feed_offer(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();
    if v_user_id is null then return false; end if;

    update public.feed_posts
    set offer_state        = 'claimed',
        claimed_by_user_id = v_user_id,
        claimed_at         = now(),
        due_date           = now() + interval '14 days'
    where id = p_post_id
      and is_offer = true
      and offer_state = 'open'
      and author_user_id <> v_user_id;

    if not found then return false; end if;

    update public.profiles
    set active_loans = active_loans + 1
    where id = v_user_id;

    return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. UPDATED FUNCTION: complete_hallway_return
--    Full karma logic replacing the flat +2/+3 awards.
--    karma_minted flag prevents double-minting if called twice.
-- ---------------------------------------------------------------------------
drop function if exists public.complete_hallway_return(uuid, text);

create or replace function public.complete_hallway_return(p_post_id uuid, p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_borrower_id       uuid;
    v_owner_id          uuid;
    v_due_date          timestamptz;
    v_return_outcome    text;
    v_borrower_karma    integer;
    v_owner_karma       integer := 3;  -- donor always earns for completed handoff
    v_reliability_delta numeric;
begin
    v_borrower_id := auth.uid();
    if v_borrower_id is null then return false; end if;

    if p_token is null or btrim(p_token) = '' then return false; end if;

    -- Validate return token
    select hrt.owner_user_id into v_owner_id
    from   public.hallway_return_tokens hrt
    where  hrt.post_id           = p_post_id
      and  hrt.borrower_user_id  = v_borrower_id
      and  hrt.token             = btrim(p_token)
      and  hrt.used_at           is null
      and  hrt.expires_at        > now();

    if v_owner_id is null then return false; end if;

    -- Validate post state and fetch due_date; karma_minted guards idempotency
    select fp.due_date into v_due_date
    from   public.feed_posts fp
    where  fp.id                 = p_post_id
      and  fp.is_offer           = true
      and  fp.offer_state        = 'claimed'
      and  fp.claimed_by_user_id = v_borrower_id
      and  fp.author_user_id     = v_owner_id
      and  fp.karma_minted       = false;

    if not found then return false; end if;

    -- Mark post returned + idempotency flag
    update public.feed_posts
    set offer_state  = 'returned',
        returned_at  = now(),
        karma_minted = true
    where id = p_post_id;

    -- Consume token
    update public.hallway_return_tokens
    set used_at = now()
    where post_id = p_post_id
      and token   = btrim(p_token)
      and used_at is null;

    -- ── Return timing classification ──────────────────────────────────────
    if v_due_date is null then
        v_return_outcome    := 'on_time';
    elsif now() < (v_due_date - interval '1 day') then
        v_return_outcome    := 'early';
    elsif now() <= v_due_date then
        v_return_outcome    := 'on_time';
    else
        v_return_outcome    := 'late';
    end if;

    case v_return_outcome
        when 'early'   then v_borrower_karma := 3;  v_reliability_delta := 0.10;
        when 'on_time' then v_borrower_karma := 2;  v_reliability_delta := 0.05;
        else                v_borrower_karma := -3; v_reliability_delta := -0.10; -- late
    end case;

    -- ── Borrower: karma + reliability + active_loans ──────────────────────
    update public.profiles
    set karma             = greatest(0, karma + v_borrower_karma),
        reliability_score = greatest(0.00, least(2.00, reliability_score + v_reliability_delta)),
        active_loans      = greatest(0, active_loans - 1)
    where id = v_borrower_id;

    insert into public.karma_events (user_id, delta, reason, ref_id)
    values (v_borrower_id, v_borrower_karma, 'return_' || v_return_outcome, p_post_id);

    -- ── Owner: flat completion reward ─────────────────────────────────────
    update public.profiles
    set karma = greatest(0, karma + v_owner_karma)
    where id = v_owner_id;

    insert into public.karma_events (user_id, delta, reason, ref_id)
    values (v_owner_id, v_owner_karma, 'owner_return_complete', p_post_id);

    return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. NEW FUNCTION: award_donation_karma
--    Called after a vault item is created to mint donation karma.
--
--    Formula:
--      BaseKarma          = estimated_price × utilityFactor × conditionFactor
--      DonationKarma      = round(BaseKarma × seasonalMultiplier)
--                           clamped to [5, 100]
--      utilityFactor      : high=1.0 | medium=0.7 | low=0.4
--      conditionFactor    : new=1.0  | good=0.7   | worn=0.4
--      seasonalMultiplier : triage_mode ? 2.0 : 1.0
--
--    Trust gate: only the item's creator (auth.uid()) can call this.
--    Returns the karma awarded (0 = ineligible / already awarded).
-- ---------------------------------------------------------------------------
drop function if exists public.award_donation_karma(uuid, boolean);

create or replace function public.award_donation_karma(
    p_item_id       uuid,
    p_is_triage_mode boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_donor_id          uuid;
    v_price             numeric;
    v_utility           text;
    v_condition         text;
    v_utility_factor    numeric;
    v_condition_factor  numeric;
    v_seasonal_mult     numeric;
    v_base_karma        numeric;
    v_karma_delta       integer;
begin
    -- Verify caller is the item's creator
    select created_by_user_id, estimated_price, utility_level, condition_level
    into   v_donor_id, v_price, v_utility, v_condition
    from   public.vault_items
    where  id = p_item_id
      and  created_by_user_id = auth.uid();

    if not found then return 0; end if;

    v_utility_factor := case v_utility
        when 'high'   then 1.0
        when 'medium' then 0.7
        else 0.4  -- 'low'
    end;

    v_condition_factor := case v_condition
        when 'new'  then 1.0
        when 'good' then 0.7
        else 0.4  -- 'worn'
    end;

    v_seasonal_mult := case when p_is_triage_mode then 2.0 else 1.0 end;

    v_base_karma   := v_price * v_utility_factor * v_condition_factor;
    v_karma_delta  := greatest(5, least(100, round(v_base_karma * v_seasonal_mult)::integer));

    update public.profiles
    set karma = karma + v_karma_delta
    where id = v_donor_id;

    insert into public.karma_events (user_id, delta, reason, ref_id)
    values (v_donor_id, v_karma_delta, 'donation', p_item_id);

    return v_karma_delta;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. NEW FUNCTION: apply_abuse_penalty
--    Negative karma for violations. Caller must be an authenticated counterparty
--    (not the target themselves). In production, restrict further via RBAC.
--
--    Penalty table:
--      no_show               : -10 karma, -0.20 reliability
--      fake_listing          : -25 karma, -0.30 reliability
--      item_damage           : -15 karma, -0.40 reliability
--      repeated_cancellation :  -5 karma, -0.05 reliability
-- ---------------------------------------------------------------------------
drop function if exists public.apply_abuse_penalty(uuid, text, uuid);

create or replace function public.apply_abuse_penalty(
    p_target_user_id uuid,
    p_reason         text,  -- see penalty table above
    p_ref_id         uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_caller_id         uuid;
    v_karma_delta       integer;
    v_reliability_delta numeric;
begin
    v_caller_id := auth.uid();
    if v_caller_id is null then return false; end if;

    -- Prevent self-reporting (abuse of the abuse system)
    if v_caller_id = p_target_user_id then return false; end if;

    case p_reason
        when 'no_show'               then v_karma_delta := -10; v_reliability_delta := -0.20;
        when 'fake_listing'          then v_karma_delta := -25; v_reliability_delta := -0.30;
        when 'item_damage'           then v_karma_delta := -15; v_reliability_delta := -0.40;
        when 'repeated_cancellation' then v_karma_delta :=  -5; v_reliability_delta := -0.05;
        else return false;  -- unknown reason → reject
    end case;

    update public.profiles
    set karma             = greatest(0, karma + v_karma_delta),
        reliability_score = greatest(0.00, reliability_score + v_reliability_delta)
    where id = p_target_user_id;

    if not found then return false; end if;

    insert into public.karma_events (user_id, delta, reason, ref_id)
    values (p_target_user_id, v_karma_delta, 'abuse_' || p_reason, p_ref_id);

    return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. NEW FUNCTION: get_borrow_priority
--    Returns the priority score for queue ordering when multiple users
--    request the same Library item.
--
--    BorrowPriority = (max(karma,1) ^ 0.7) × reliability_score / (active_loans + 1)
--
--    Higher score = higher priority. Call for each candidate and ORDER BY DESC.
-- ---------------------------------------------------------------------------
drop function if exists public.get_borrow_priority(uuid);

create or replace function public.get_borrow_priority(p_user_id uuid)
returns numeric
language sql
security definer
stable
set search_path = public
as $$
    select round(
        power(greatest(karma, 1)::numeric, 0.7)
        * reliability_score
        / (active_loans + 1)
    , 4)
    from public.profiles
    where id = p_user_id;
$$;

-- ---------------------------------------------------------------------------
-- 10. GRANTS
-- ---------------------------------------------------------------------------
grant execute on function public.reserve_vault_item(uuid)                  to authenticated;
grant execute on function public.return_vault_item(uuid)                   to authenticated;
grant execute on function public.claim_feed_offer(uuid)                    to authenticated;
grant execute on function public.complete_hallway_return(uuid, text)       to authenticated;
grant execute on function public.award_donation_karma(uuid, boolean)       to authenticated;
grant execute on function public.apply_abuse_penalty(uuid, text, uuid)     to authenticated;
grant execute on function public.get_borrow_priority(uuid)                 to authenticated;
