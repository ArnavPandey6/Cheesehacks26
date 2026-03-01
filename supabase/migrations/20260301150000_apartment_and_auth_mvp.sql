-- Add apartment support and normalize legacy combined unit values.
alter table public.profiles add column if not exists apartment text;

update public.profiles
set apartment = regexp_replace(unit, '^Apartment\\s+([^/]+)\\s*/\\s*Unit\\s+.*$', '\1')
where (apartment is null or btrim(apartment) = '')
  and unit ~* '^Apartment\\s+.+\\s*/\\s*Unit\\s+.+$';

update public.profiles
set unit = regexp_replace(unit, '^Apartment\\s+[^/]+\\s*/\\s*Unit\\s+(.+)$', '\1')
where unit ~* '^Apartment\\s+.+\\s*/\\s*Unit\\s+.+$';

update public.profiles
set apartment = 'Unknown'
where apartment is null or btrim(apartment) = '';

alter table public.profiles alter column apartment set not null;

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
