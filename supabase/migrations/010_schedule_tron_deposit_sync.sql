-- Background TRON deposit scanner every minute
create extension if not exists pg_net;

do $$
declare
 v_secret text;
 v_hash text;
begin
 select decrypted_secret into v_secret
 from vault.decrypted_secrets
 where name='tron_deposit_cron_secret'
 limit 1;

 if v_secret is null then
   v_secret:=encode(gen_random_bytes(32),'hex');
   perform vault.create_secret(v_secret,'tron_deposit_cron_secret','BITMATE TRON deposit cron authentication');
 end if;

 v_hash:=encode(digest(v_secret,'sha256'),'hex');

 insert into public.system_settings(key,value,updated_at)
 values('TRON_DEPOSIT_CRON_SECRET_HASH',to_jsonb(v_hash),now())
 on conflict(key)
 do update set value=excluded.value,updated_at=now();
end $$;

select cron.schedule(
 'tron-deposit-auto-sync',
 '* * * * *',
 $cron$
 select net.http_post(
   url:='https://fgyiofykvpkxpeylcocn.supabase.co/functions/v1/tron-deposit-cron',
   headers:=jsonb_build_object(
     'Content-Type','application/json',
     'x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='tron_deposit_cron_secret' limit 1)
   ),
   body:=jsonb_build_object('time',now()),
   timeout_milliseconds:=50000
 ) as request_id;
 $cron$
);
