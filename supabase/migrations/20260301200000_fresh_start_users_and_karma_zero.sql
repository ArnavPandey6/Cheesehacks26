-- Fresh-start reset:
-- 1) New users start at 0 karma.
-- 2) Remove existing app data.
-- 3) Remove existing users so signup/login is fully fresh.

alter table public.profiles
    alter column karma set default 0;

do $$
begin
    if to_regclass('public.feed_post_chat_reads') is not null then
        execute 'truncate table public.feed_post_chat_reads restart identity cascade';
    end if;

    if to_regclass('public.feed_post_messages') is not null then
        execute 'truncate table public.feed_post_messages restart identity cascade';
    end if;

    if to_regclass('public.hallway_return_tokens') is not null then
        execute 'truncate table public.hallway_return_tokens restart identity cascade';
    end if;

    if to_regclass('public.karma_events') is not null then
        execute 'truncate table public.karma_events restart identity cascade';
    end if;

    if to_regclass('public.feed_posts') is not null then
        execute 'truncate table public.feed_posts restart identity cascade';
    end if;

    if to_regclass('public.vault_items') is not null then
        execute 'truncate table public.vault_items restart identity cascade';
    end if;
end;
$$;

-- Deletes all signed-up users in this Supabase project.
-- profiles rows are removed via FK cascade from auth.users.
delete from auth.users;

-- Safety cleanup in case any profile rows remain.
delete from public.profiles;
