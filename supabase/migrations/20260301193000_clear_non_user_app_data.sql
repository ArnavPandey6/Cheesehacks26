-- Fresh-state reset: clear all non-user application tables.
-- Keeps auth users/profiles intact.

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

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'profiles'
          and column_name = 'active_loans'
    ) then
        execute 'update public.profiles set active_loans = 0 where active_loans <> 0';
    end if;
end;
$$;
