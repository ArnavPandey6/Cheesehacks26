-- Add product category for vault filtering.

alter table public.vault_items
    add column if not exists product_category text not null default 'Uncategorized';

update public.vault_items
set product_category = 'Uncategorized'
where product_category is null or btrim(product_category) = '';

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'vault_product_category_nonempty_check'
          and conrelid = 'public.vault_items'::regclass
    ) then
        alter table public.vault_items
            add constraint vault_product_category_nonempty_check
            check (char_length(btrim(product_category)) > 0);
    end if;
end;
$$;

create index if not exists idx_vault_items_product_category
    on public.vault_items(product_category);
