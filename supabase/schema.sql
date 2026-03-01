-- Run this in Supabase SQL Editor (project database).
-- Safe to re-run: uses IF EXISTS / IF NOT EXISTS where possible.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    name text not null,
    apartment text not null,
    unit text not null,
    email text not null unique,
    karma integer not null default 10 check (karma >= 0),
    created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists apartment text;
update public.profiles
set apartment = 'Unknown'
where apartment is null or btrim(apartment) = '';
alter table public.profiles alter column apartment set not null;

create table if not exists public.vault_items (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text not null,
    image_url text not null,
    status text not null default 'available' check (status in ('available', 'reserved', 'on-loan')),
    min_karma_required integer not null default 0 check (min_karma_required >= 0),
    reserved_by_user_id uuid null references public.profiles(id) on delete set null,
    created_by_user_id uuid null references public.profiles(id) on delete set null,
    created_at timestamptz not null default now()
);

create table if not exists public.feed_posts (
    id uuid primary key default gen_random_uuid(),
    author_user_id uuid not null references public.profiles(id) on delete cascade,
    content text not null,
    is_offer boolean not null default false,
    image_url text null,
    offer_state text not null default 'open' check (offer_state in ('open', 'claimed', 'returned')),
    claimed_by_user_id uuid null references public.profiles(id) on delete set null,
    claimed_at timestamptz null,
    returned_at timestamptz null,
    created_at timestamptz not null default now()
);

create table if not exists public.feed_post_messages (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.feed_posts(id) on delete cascade,
    sender_user_id uuid not null references public.profiles(id) on delete cascade,
    body text not null check (char_length(btrim(body)) > 0 and char_length(body) <= 1000),
    created_at timestamptz not null default now()
);

create table if not exists public.feed_post_chat_reads (
    user_id uuid not null references public.profiles(id) on delete cascade,
    post_id uuid not null references public.feed_posts(id) on delete cascade,
    last_read_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    primary key (user_id, post_id)
);

create table if not exists public.hallway_return_tokens (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null unique references public.feed_posts(id) on delete cascade,
    owner_user_id uuid not null references public.profiles(id) on delete cascade,
    borrower_user_id uuid not null references public.profiles(id) on delete cascade,
    token text not null unique,
    expires_at timestamptz not null,
    used_at timestamptz null,
    created_at timestamptz not null default now()
);

create index if not exists idx_vault_items_status_created_at on public.vault_items(status, created_at desc);
create index if not exists idx_feed_posts_created_at on public.feed_posts(created_at desc);
create index if not exists idx_feed_posts_offer_state on public.feed_posts(is_offer, offer_state);
create index if not exists idx_feed_post_messages_post_created_at on public.feed_post_messages(post_id, created_at asc);
create index if not exists idx_feed_post_messages_sender_created_at on public.feed_post_messages(sender_user_id, created_at desc);
create index if not exists idx_feed_post_chat_reads_user_last_read on public.feed_post_chat_reads(user_id, last_read_at desc);
create index if not exists idx_hallway_return_tokens_borrower on public.hallway_return_tokens(borrower_user_id, expires_at desc);

alter table public.profiles enable row level security;
alter table public.vault_items enable row level security;
alter table public.feed_posts enable row level security;
alter table public.feed_post_messages enable row level security;
alter table public.feed_post_chat_reads enable row level security;
alter table public.hallway_return_tokens enable row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_upsert_self on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (true);

create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (auth.uid() = id);

create policy profiles_update_self on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists vault_select on public.vault_items;
drop policy if exists vault_insert on public.vault_items;
drop policy if exists vault_update_authenticated on public.vault_items;
create policy vault_select on public.vault_items
for select to authenticated
using (true);

create policy vault_insert on public.vault_items
for insert to authenticated
with check (created_by_user_id = auth.uid());

drop policy if exists feed_select on public.feed_posts;
drop policy if exists feed_insert_author on public.feed_posts;
drop policy if exists feed_update_authenticated on public.feed_posts;
drop policy if exists feed_delete_author on public.feed_posts;
create policy feed_select on public.feed_posts
for select to authenticated
using (true);

create policy feed_insert_author on public.feed_posts
for insert to authenticated
with check (author_user_id = auth.uid());
create policy feed_delete_author on public.feed_posts
for delete to authenticated
using (author_user_id = auth.uid());

drop policy if exists feed_post_messages_select on public.feed_post_messages;
drop policy if exists feed_post_messages_insert_sender on public.feed_post_messages;
create policy feed_post_messages_select on public.feed_post_messages
for select to authenticated
using (true);

create policy feed_post_messages_insert_sender on public.feed_post_messages
for insert to authenticated
with check (sender_user_id = auth.uid());

drop policy if exists feed_post_chat_reads_select_own on public.feed_post_chat_reads;
drop policy if exists feed_post_chat_reads_insert_own on public.feed_post_chat_reads;
drop policy if exists feed_post_chat_reads_update_own on public.feed_post_chat_reads;
create policy feed_post_chat_reads_select_own on public.feed_post_chat_reads
for select to authenticated
using (user_id = auth.uid());

create policy feed_post_chat_reads_insert_own on public.feed_post_chat_reads
for insert to authenticated
with check (user_id = auth.uid());

create policy feed_post_chat_reads_update_own on public.feed_post_chat_reads
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists hallway_return_tokens_owner_or_borrower_select on public.hallway_return_tokens;
create policy hallway_return_tokens_owner_or_borrower_select on public.hallway_return_tokens
for select to authenticated
using (owner_user_id = auth.uid() or borrower_user_id = auth.uid());

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, name, apartment, unit, email)
    values (
        new.id,
        coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, ''), '@', 1), 'Neighbor'),
        coalesce(nullif(new.raw_user_meta_data ->> 'apartment', ''), 'Unknown'),
        coalesce(nullif(new.raw_user_meta_data ->> 'unit', ''), 'Unknown'),
        coalesce(new.email, '')
    )
    on conflict (id) do update
    set
        name = excluded.name,
        apartment = excluded.apartment,
        unit = excluded.unit,
        email = excluded.email;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_created();

drop function if exists public.adjust_user_karma(uuid, integer);
drop function if exists public.reserve_vault_item(uuid, uuid);
drop function if exists public.return_vault_item(uuid, uuid);
drop function if exists public.claim_feed_offer(uuid, uuid);
drop function if exists public.complete_hallway_return(uuid, uuid);
drop function if exists public.complete_hallway_return(uuid);
drop function if exists public.create_hallway_return_token(uuid);

create or replace function public.adjust_user_karma(p_delta integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return false;
    end if;

    if p_delta = 0 then
        return true;
    end if;

    if p_delta < -100 or p_delta > 100 then
        raise exception 'Karma delta is out of range.';
    end if;

    update public.profiles
    set karma = greatest(0, karma + p_delta)
    where id = v_user_id;

    return found;
end;
$$;

create or replace function public.reserve_vault_item(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_user_karma integer;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return false;
    end if;

    select karma into v_user_karma
    from public.profiles
    where id = v_user_id;

    if v_user_karma is null then
        return false;
    end if;

    update public.vault_items
    set status = 'reserved',
        reserved_by_user_id = v_user_id
    where id = p_item_id
      and status = 'available'
      and min_karma_required <= v_user_karma;

    return found;
end;
$$;

create or replace function public.return_vault_item(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return false;
    end if;

    update public.vault_items
    set status = 'available',
        reserved_by_user_id = null
    where id = p_item_id
      and reserved_by_user_id = v_user_id
      and status <> 'available';

    return found;
end;
$$;

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
    if v_user_id is null then
        return false;
    end if;

    update public.feed_posts
    set offer_state = 'claimed',
        claimed_by_user_id = v_user_id,
        claimed_at = now()
    where id = p_post_id
      and is_offer = true
      and offer_state = 'open'
      and author_user_id <> v_user_id;

    return found;
end;
$$;

create or replace function public.create_hallway_return_token(p_post_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_owner_id uuid;
    v_borrower_id uuid;
    v_token text;
begin
    v_owner_id := auth.uid();
    if v_owner_id is null then
        return null;
    end if;

    select claimed_by_user_id into v_borrower_id
    from public.feed_posts
    where id = p_post_id
      and is_offer = true
      and offer_state = 'claimed'
      and author_user_id = v_owner_id;

    if v_borrower_id is null then
        return null;
    end if;

    v_token := substring(
        md5(
            random()::text
            || clock_timestamp()::text
            || p_post_id::text
            || v_owner_id::text
            || v_borrower_id::text
        ) || md5(
            random()::text
            || now()::text
            || txid_current()::text
        )
        from 1 for 48
    );

    insert into public.hallway_return_tokens (
        post_id,
        owner_user_id,
        borrower_user_id,
        token,
        expires_at,
        used_at
    )
    values (
        p_post_id,
        v_owner_id,
        v_borrower_id,
        v_token,
        now() + interval '10 minutes',
        null
    )
    on conflict (post_id) do update
    set
        owner_user_id = excluded.owner_user_id,
        borrower_user_id = excluded.borrower_user_id,
        token = excluded.token,
        expires_at = excluded.expires_at,
        used_at = null,
        created_at = now();

    return v_token;
end;
$$;

create or replace function public.complete_hallway_return(p_post_id uuid, p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_borrower_id uuid;
    v_owner_id uuid;
begin
    v_borrower_id := auth.uid();
    if v_borrower_id is null then
        return false;
    end if;

    if p_token is null or btrim(p_token) = '' then
        return false;
    end if;

    select owner_user_id into v_owner_id
    from public.hallway_return_tokens
    where post_id = p_post_id
      and borrower_user_id = v_borrower_id
      and token = btrim(p_token)
      and used_at is null
      and expires_at > now();

    if v_owner_id is null then
        return false;
    end if;

    update public.feed_posts
    set offer_state = 'returned',
        returned_at = now()
    where id = p_post_id
      and is_offer = true
      and offer_state = 'claimed'
      and claimed_by_user_id = v_borrower_id
      and author_user_id = v_owner_id;

    if not found then
        return false;
    end if;

    update public.hallway_return_tokens
    set used_at = now()
    where post_id = p_post_id
      and token = btrim(p_token)
      and used_at is null;

    update public.profiles
    set karma = greatest(0, karma + 2)
    where id = v_borrower_id;

    update public.profiles
    set karma = greatest(0, karma + 3)
    where id = v_owner_id;

    return true;
end;
$$;

grant execute on function public.adjust_user_karma(integer) to authenticated;
grant execute on function public.reserve_vault_item(uuid) to authenticated;
grant execute on function public.return_vault_item(uuid) to authenticated;
grant execute on function public.claim_feed_offer(uuid) to authenticated;
grant execute on function public.create_hallway_return_token(uuid) to authenticated;
grant execute on function public.complete_hallway_return(uuid, text) to authenticated;

insert into storage.buckets (id, name, public)
values ('relay-images', 'relay-images', true)
on conflict (id) do update
set public = true;

drop policy if exists relay_images_public_read on storage.objects;
create policy relay_images_public_read on storage.objects
for select to public
using (bucket_id = 'relay-images');

drop policy if exists relay_images_auth_insert on storage.objects;
create policy relay_images_auth_insert on storage.objects
for insert to authenticated
with check (
    bucket_id = 'relay-images'
    and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists relay_images_auth_update on storage.objects;
create policy relay_images_auth_update on storage.objects
for update to authenticated
using (
    bucket_id = 'relay-images'
    and owner_id::text = auth.uid()::text
)
with check (
    bucket_id = 'relay-images'
    and owner_id::text = auth.uid()::text
);

drop policy if exists relay_images_auth_delete on storage.objects;
create policy relay_images_auth_delete on storage.objects
for delete to authenticated
using (
    bucket_id = 'relay-images'
    and owner_id::text = auth.uid()::text
);

do $$
begin
    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'profiles'
    ) then
        alter publication supabase_realtime add table public.profiles;
    end if;

    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'vault_items'
    ) then
        alter publication supabase_realtime add table public.vault_items;
    end if;

    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'feed_posts'
    ) then
        alter publication supabase_realtime add table public.feed_posts;
    end if;

    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'feed_post_messages'
    ) then
        alter publication supabase_realtime add table public.feed_post_messages;
    end if;
end;
$$;
