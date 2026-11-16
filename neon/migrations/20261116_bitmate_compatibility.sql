-- BITMATE Neon compatibility additions, 2026-11-16.
-- Run AFTER the restored original BITMATE tables, bm_auth_users/sessions,
-- dealer_codes/dealer_members, p2p_ads/p2p_orders and settlement functions exist.
-- Preserve both the original SQL in supabase/migrations and this adaptation.
-- Trading is INTERNAL/VIRTUAL; no external exchange orders.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS private;
CREATE SCHEMA IF NOT EXISTS futures_private;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY REFERENCES public.bm_auth_users(id) ON DELETE CASCADE,
  email text,
  phone text,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_app_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  email_confirmed_at timestamptz,
  phone_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz,
  encrypted_password text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('request.jwt.claim.role',true),'') $$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT jsonb_build_object('sub',auth.uid(),'app_metadata',COALESCE(
 (SELECT u.raw_app_meta_data FROM auth.users u WHERE u.id=auth.uid()),'{}'::jsonb)) $$;

CREATE OR REPLACE FUNCTION auth.sync_bm_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ BEGIN
 INSERT INTO auth.users(id,email,raw_app_meta_data)
 VALUES(new.id,new.email,jsonb_build_object('role',new.role))
 ON CONFLICT(id) DO UPDATE
 SET email=excluded.email,raw_app_meta_data=excluded.raw_app_meta_data;
 RETURN new;
END $$;
DROP TRIGGER IF EXISTS bm_auth_sync_user ON public.bm_auth_users;
CREATE TRIGGER bm_auth_sync_user AFTER INSERT OR UPDATE OF email,role
ON public.bm_auth_users FOR EACH ROW EXECUTE FUNCTION auth.sync_bm_user();

CREATE OR REPLACE FUNCTION auth.sync_frozen_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ BEGIN
 UPDATE public.bm_auth_users
 SET is_blocked=(new.banned_until IS NOT NULL AND new.banned_until>now())
 WHERE id=new.id AND is_blocked IS DISTINCT FROM (new.banned_until IS NOT NULL AND new.banned_until>now());
 IF new.banned_until IS NOT NULL AND new.banned_until>now() THEN
   DELETE FROM public.bm_auth_sessions WHERE user_id=new.id;
 END IF;
 RETURN new;
END $$;
DROP TRIGGER IF EXISTS auth_user_sync_frozen ON auth.users;
CREATE TRIGGER auth_user_sync_frozen AFTER UPDATE OF banned_until
ON auth.users FOR EACH ROW EXECUTE FUNCTION auth.sync_frozen_status();

CREATE OR REPLACE FUNCTION private.cfd_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT public.is_admin_user() $$;

CREATE OR REPLACE FUNCTION public.sync_legacy_dealer_to_auth() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ BEGIN
 UPDATE public.bm_auth_users SET role='dealer' WHERE id=new.owner_user_id AND role='user';
 INSERT INTO public.bm_dealer_codes(owner_id,code,enabled)
 VALUES(new.owner_user_id,new.code,new.active)
 ON CONFLICT(owner_id) DO UPDATE SET code=excluded.code,enabled=excluded.enabled;
 RETURN new;
END $$;
DROP TRIGGER IF EXISTS bitmate_sync_dealer_auth ON public.dealer_codes;
CREATE TRIGGER bitmate_sync_dealer_auth
AFTER INSERT OR UPDATE OF code,owner_user_id,active ON public.dealer_codes
FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_dealer_to_auth();

CREATE OR REPLACE FUNCTION public.sync_bm_dealer_members() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE original_code_id uuid;code_value text;
BEGIN
 SELECT d.id,d.code INTO original_code_id,code_value
 FROM public.dealer_codes d
 JOIN public.bm_dealer_codes b ON b.owner_id=d.owner_user_id
 WHERE b.id=new.dealer_id;
 IF original_code_id IS NOT NULL THEN
   INSERT INTO public.dealer_members(dealer_code_id,user_id,signup_code)
   VALUES(original_code_id,new.user_id,code_value) ON CONFLICT(user_id) DO NOTHING;
 END IF;
 RETURN new;
END $$;
DROP TRIGGER IF EXISTS bitmate_sync_bm_dealer_members ON public.bm_dealer_members;
CREATE TRIGGER bitmate_sync_bm_dealer_members
AFTER INSERT ON public.bm_dealer_members
FOR EACH ROW EXECUTE FUNCTION public.sync_bm_dealer_members();

CREATE TABLE IF NOT EXISTS public.cfd_risk_acceptances(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 version text NOT NULL,
 accepted_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,version)
);
CREATE OR REPLACE FUNCTION public.accept_cfd_risk(p_version text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$ BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF length(p_version)<3 OR length(p_version)>60 THEN RAISE EXCEPTION 'INVALID_VERSION'; END IF;
 INSERT INTO public.cfd_risk_acceptances(user_id,version)
 VALUES(auth.uid(),p_version) ON CONFLICT(user_id,version) DO NOTHING;
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.p2p_create_order_live(
 p_ad_id uuid,p_asset_amount numeric,p_payment_method text,p_live_price numeric)
RETURNS public.p2p_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE ad public.p2p_ads%rowtype;fiat_amount numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 IF coalesce(p_asset_amount,0)<=0 OR p_asset_amount>1000000 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
 SELECT * INTO ad FROM public.p2p_ads WHERE id=p_ad_id AND status='ACTIVE' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ad_not_available'; END IF;
 IF ad.price<=0 THEN RAISE EXCEPTION 'invalid_ad_price'; END IF;
 -- Only the seller's persisted offer price is authoritative.
 fiat_amount:=round(p_asset_amount*ad.price,2);
 RETURN public.p2p_create_order(p_ad_id,fiat_amount,p_payment_method);
END $$;
