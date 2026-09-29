-- Harden BITMATE admin SECURITY DEFINER RPC exposure.
-- Anonymous/public callers do not need EXECUTE; admin identity checks remain inside each RPC.

revoke all on function public.admin_reset_user_password(uuid,text) from PUBLIC, anon;
grant execute on function public.admin_reset_user_password(uuid,text) to authenticated, service_role;

revoke all on function public.admin_set_cfd_timed_round_override(uuid,text,text) from PUBLIC, anon;
grant execute on function public.admin_set_cfd_timed_round_override(uuid,text,text) to authenticated, service_role;

revoke all on function public.admin_set_user_frozen(uuid,boolean,text) from PUBLIC, anon;
grant execute on function public.admin_set_user_frozen(uuid,boolean,text) to authenticated, service_role;

revoke all on function public.admin_update_notice_content(uuid,text,text,text,timestamptz) from PUBLIC, anon;
grant execute on function public.admin_update_notice_content(uuid,text,text,text,timestamptz) to authenticated, service_role;
