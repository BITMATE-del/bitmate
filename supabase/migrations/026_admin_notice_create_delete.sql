-- Admin notice create/delete functions with audit logging.
create or replace function public.admin_create_notice(
  p_title text,
  p_summary text default '',
  p_body text default '',
  p_category text default 'GENERAL',
  p_status text default 'PUBLISHED',
  p_pinned boolean default false,
  p_published_at timestamptz default now()
)
returns public.notices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_super boolean;
  v_row public.notices;
  v_slug text;
begin
  v_role := lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role',''));
  v_super := coalesce((auth.jwt() -> 'app_metadata' ->> 'superadmin')::boolean,false);
  if v_role not in ('admin','superadmin') and not v_super then
    raise exception 'admin role required';
  end if;
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(btrim(p_title),'') is null then raise exception 'title required'; end if;
  if upper(coalesce(p_category,'')) not in ('GENERAL','TRADING','DEPOSIT_WITHDRAWAL','SYSTEM','LISTING','EVENT','SECURITY') then
    raise exception 'invalid category';
  end if;
  if upper(coalesce(p_status,'')) not in ('DRAFT','PUBLISHED','ARCHIVED') then
    raise exception 'invalid status';
  end if;

  v_slug := 'notice-' || to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);

  insert into public.notices(slug,category,title,summary,body,pinned,status,published_at)
  values(
    v_slug,
    upper(p_category),
    btrim(p_title),
    coalesce(p_summary,''),
    coalesce(p_body,''),
    coalesce(p_pinned,false),
    upper(p_status),
    case when upper(p_status)='DRAFT' then p_published_at else coalesce(p_published_at,now()) end
  )
  returning * into v_row;

  insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value)
  values(auth.uid(),'NOTICE_CREATE','notice',v_row.id::text,null,to_jsonb(v_row));

  return v_row;
end;
$$;

create or replace function public.admin_delete_notice(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_super boolean;
  v_before public.notices;
begin
  v_role := lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role',''));
  v_super := coalesce((auth.jwt() -> 'app_metadata' ->> 'superadmin')::boolean,false);
  if v_role not in ('admin','superadmin') and not v_super then
    raise exception 'admin role required';
  end if;
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into v_before from public.notices where id=p_id for update;
  if not found then raise exception 'notice not found'; end if;

  insert into public.admin_logs(admin_user_id,action,target_type,target_id,before_value,after_value)
  values(auth.uid(),'NOTICE_DELETE','notice',p_id::text,to_jsonb(v_before),null);

  delete from public.notices where id=p_id;
  return true;
end;
$$;

revoke all on function public.admin_create_notice(text,text,text,text,text,boolean,timestamptz) from public, anon;
revoke all on function public.admin_delete_notice(uuid) from public, anon;
grant execute on function public.admin_create_notice(text,text,text,text,text,boolean,timestamptz) to authenticated;
grant execute on function public.admin_delete_notice(uuid) to authenticated;
