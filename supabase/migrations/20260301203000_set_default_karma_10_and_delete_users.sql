-- Requested reset:
-- 1) New users start at 10 karma.
-- 2) Delete all existing users.

alter table public.profiles
    alter column karma set default 10;

delete from auth.users;

-- Safety cleanup in case any profile rows remain.
delete from public.profiles;
