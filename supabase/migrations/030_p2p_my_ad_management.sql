create or replace function public.p2p_update_my_ad(
 p_id uuid,p_price numeric,p_available_amount numeric,p_min_order numeric,p_max_order numeric,
 p_payment_methods text[],p_fee_rate numeric,p_headline text,p_terms text
) returns public.p2p_ads language plpgsql security definer set search_path='' as $$
declare v public.p2p_ads;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if p_price<=0 or p_available_amount<0 then raise exception 'invalid_amount'; end if;
 if p_min_order<0 or p_max_order<=0 or p_max_order<p_min_order then raise exception 'invalid_order_limit'; end if;
 if coalesce(p_fee_rate,0)<0 or coalesce(p_fee_rate,0)>10 then raise exception 'invalid_fee_rate'; end if;
 update public.p2p_ads set price=p_price,available_amount=p_available_amount,min_order=p_min_order,max_order=p_max_order,
 payment_methods=coalesce(p_payment_methods,'{}'),fee_rate=coalesce(p_fee_rate,0),headline=coalesce(p_headline,''),terms=coalesce(p_terms,''),updated_at=now()
 where id=p_id and user_id=auth.uid() and status<>'SUSPENDED' returning * into v;
 if not found then raise exception 'ad_not_found'; end if;
 return v;
end $$;

create or replace function public.p2p_market_snapshot()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_ads jsonb;v_player jsonb;v_orders jsonb;v_my_ads jsonb;v_uid uuid:=auth.uid();
begin
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_ads from (
 select a.id,a.user_id,a.side,a.asset,a.fiat,a.price,a.available_amount,a.min_order,a.max_order,a.payment_methods,a.status,a.fee_rate,a.headline,a.terms,a.created_at,p.nickname,p.bio,p.completed_orders
 from public.p2p_ads a left join public.p2p_players p on p.id=a.player_id where a.status='ACTIVE' and (p.status='APPROVED' or p.id is null)) x;
 if v_uid is null then v_player:='null'::jsonb;v_orders:='[]'::jsonb;v_my_ads:='[]'::jsonb;
 else
 select to_jsonb(p) into v_player from public.p2p_players p where p.user_id=v_uid;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_orders from (
 select o.*,bp.nickname buyer_nickname,sp.nickname seller_nickname from public.p2p_orders o
 left join public.p2p_players bp on bp.user_id=o.buyer_id left join public.p2p_players sp on sp.user_id=o.seller_id
 where v_uid in (o.buyer_id,o.seller_id)) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_my_ads from (
 select a.id,a.user_id,a.side,a.asset,a.fiat,a.price,a.available_amount,a.min_order,a.max_order,a.payment_methods,a.status,a.fee_rate,a.headline,a.terms,a.created_at,p.nickname,p.bio,p.completed_orders
 from public.p2p_ads a left join public.p2p_players p on p.id=a.player_id where a.user_id=v_uid) x;
 end if;
 return jsonb_build_object('ads',v_ads,'my_player',v_player,'my_orders',v_orders,'my_ads',v_my_ads);
end $$;

revoke all on function public.p2p_update_my_ad(uuid,numeric,numeric,numeric,numeric,text[],numeric,text,text) from public,anon;
grant execute on function public.p2p_update_my_ad(uuid,numeric,numeric,numeric,numeric,text[],numeric,text,text) to authenticated;
