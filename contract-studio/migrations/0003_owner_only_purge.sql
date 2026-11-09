create or replace function contract_versions_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.approval_state = 'approved' then
      if current_user = 'studio_app'
         or coalesce(current_setting('studio.allow_purge', true), 'off') <> 'on' then
        raise exception 'approved contract versions cannot be deleted' using errcode = 'restrict_violation';
      end if;
    end if;
    return old;
  end if;
  if old.approval_state = 'approved'
     or new.contract_id <> old.contract_id or new.version <> old.version
     or new.content <> old.content or new.rendered_html <> old.rendered_html
     or new.content_sha256 <> old.content_sha256 or new.source <> old.source
     or new.created_at <> old.created_at or new.approval_state <> 'approved' then
    raise exception 'contract versions are immutable' using errcode = 'restrict_violation';
  end if;
  return new;
end $$;
