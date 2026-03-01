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

grant execute on function public.create_hallway_return_token(uuid) to authenticated;
