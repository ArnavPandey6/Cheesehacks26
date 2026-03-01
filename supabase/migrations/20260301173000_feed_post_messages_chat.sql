create table if not exists public.feed_post_messages (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.feed_posts(id) on delete cascade,
    sender_user_id uuid not null references public.profiles(id) on delete cascade,
    body text not null check (char_length(btrim(body)) > 0 and char_length(body) <= 1000),
    created_at timestamptz not null default now()
);

create index if not exists idx_feed_post_messages_post_created_at
on public.feed_post_messages(post_id, created_at asc);

create index if not exists idx_feed_post_messages_sender_created_at
on public.feed_post_messages(sender_user_id, created_at desc);

alter table public.feed_post_messages enable row level security;

drop policy if exists feed_post_messages_select on public.feed_post_messages;
drop policy if exists feed_post_messages_insert_sender on public.feed_post_messages;

create policy feed_post_messages_select on public.feed_post_messages
for select to authenticated
using (true);

create policy feed_post_messages_insert_sender on public.feed_post_messages
for insert to authenticated
with check (sender_user_id = auth.uid());

do $$
begin
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
