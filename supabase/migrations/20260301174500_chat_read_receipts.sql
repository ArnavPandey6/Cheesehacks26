create table if not exists public.feed_post_chat_reads (
    user_id uuid not null references public.profiles(id) on delete cascade,
    post_id uuid not null references public.feed_posts(id) on delete cascade,
    last_read_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    primary key (user_id, post_id)
);

create index if not exists idx_feed_post_chat_reads_user_last_read
on public.feed_post_chat_reads(user_id, last_read_at desc);

alter table public.feed_post_chat_reads enable row level security;

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
