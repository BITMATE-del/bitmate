'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon from './UiIcon';
import s from './AdminP2P.module.css';

type Ad={id:string;user_id:string;email:string|null;side:string;asset:string;fiat:string;price:number;available_amount:number;min_order:number;max_order:number;payment_methods:string[];status:string;created_at:string};
type Order={id:string;ad_id:string|null;buyer_id:string;seller_id:string;buyer_email:string|null;seller_email:string|null;asset:string;fiat:string;price:number;asset_amount:number;fiat_amount:number;payment_method:string|null;status:string;created_at:string};
type Snap={ads:Ad[];orders:Order[];stats:Record<string,number>};

export default function AdminP2P(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [allowed,setAllowed]=useState<boolean|null>(null);
 const [data,setData]=useState<Snap>({ads:[],orders:[],stats:{}});
 const [tab,setTab]=useState<'ads'|'orders'>('ads');
 const [busy,setBusy]=useState(false);
 const [msg,setMsg]=useState('');

 async function load(){
  const {data:{user}}=await supabase.auth.getUser();
  const role=String(user?.app_metadata?.role||'').toLowerCase();
  const ok=role==='admin'||role==='superadmin'||user?.app_metadata?.superadmin===true;
  setAllowed(ok);if(!ok)return;
  const {data:snap,error}=await supabase.rpc('admin_p2p_snapshot');
  if(error){setMsg(error.message);return}
  setData((snap||{}) as Snap);
 }
 useEffect(()=>{load()},[]);

 async function run(name:string,args:Record<string,unknown>,success:string){
  setBusy(true);setMsg('');
  const {error}=await supabase.rpc(name,args);
  setBusy(false);
  if(error){setMsg(error.message);return}
  setMsg(success);await load();
 }

 if(allowed===null)return <main className={s.page}><div className={s.gate}>관리자 권한 확인 중...</div></main>;
 if(!allowed)return <main className={s.page}><div className={s.gate}>관리자 권한이 필요합니다.</div></main>;

 return <main className={s.page}><div className={s.shell}>
  <header className={s.hero}><div><span>BITMATE ADMIN</span><h1>P2P Markets 관리</h1><p>P2P 광고와 주문 상태를 운영합니다. 실제 법정화폐 결제/에스크로는 외부 결제·보관 인프라와 별도 연동이 필요합니다.</p></div><div className={s.links}><Link href="/admin">관리자 홈</Link><Link href="/p2p-markets">P2P 화면</Link></div></header>
  <section className={s.stats}><div><span>활성 광고</span><b>{data.stats?.active_ads||0}</b></div><div><span>진행 주문</span><b>{data.stats?.open_orders||0}</b></div><div><span>분쟁</span><b>{data.stats?.disputes||0}</b></div></section>
  <nav className={s.tabs}><button className={tab==='ads'?s.active:''} onClick={()=>setTab('ads')}><UiIcon name="market" size={17}/> Ads</button><button className={tab==='orders'?s.active:''} onClick={()=>setTab('orders')}><UiIcon name="order" size={17}/> Orders</button></nav>
  {tab==='ads'?<section className={s.panel}><div className={s.head}><h2>P2P Ads</h2><p>사용자 광고의 노출 상태를 제어합니다.</p></div><div className={s.table}><div className={s.th}><span>회원</span><span>광고</span><span>한도</span><span>상태</span><span>관리</span></div>{data.ads.length?data.ads.map(a=><div className={s.tr} key={a.id}><span><b>{a.email||'—'}</b><small>{a.user_id.slice(0,8)}…</small></span><span><b>{a.side} {a.asset}/{a.fiat}</b><small>Price {Number(a.price).toLocaleString()}</small><small>Available {Number(a.available_amount).toLocaleString()}</small></span><span><small>{Number(a.min_order).toLocaleString()} ~ {Number(a.max_order).toLocaleString()} {a.fiat}</small><small>{(a.payment_methods||[]).join(', ')||'—'}</small></span><span><b>{a.status}</b></span><span className={s.actions}><button disabled={busy} onClick={()=>run('admin_set_p2p_ad_status',{p_id:a.id,p_status:'ACTIVE'},'광고가 활성화되었습니다.')}>활성</button><button disabled={busy} onClick={()=>run('admin_set_p2p_ad_status',{p_id:a.id,p_status:'PAUSED'},'광고가 일시중지되었습니다.')}>중지</button><button disabled={busy} onClick={()=>run('admin_set_p2p_ad_status',{p_id:a.id,p_status:'SUSPENDED'},'광고가 관리자 중지되었습니다.')}>차단</button></span></div>):<div className={s.empty}>등록된 P2P 광고가 없습니다.</div>}</div></section>
  :<section className={s.panel}><div className={s.head}><h2>P2P Orders</h2><p>주문 진행, 결제 확인, 분쟁/취소 상태를 관리합니다.</p></div><div className={s.table}><div className={s.th}><span>거래자</span><span>주문</span><span>금액</span><span>상태</span><span>관리</span></div>{data.orders.length?data.orders.map(o=><div className={s.tr} key={o.id}><span><b>Buyer {o.buyer_email||'—'}</b><small>Seller {o.seller_email||'—'}</small></span><span><b>{o.asset}/{o.fiat}</b><small>{Number(o.price).toLocaleString()} · {o.payment_method||'—'}</small></span><span><b>{Number(o.asset_amount).toLocaleString()} {o.asset}</b><small>{Number(o.fiat_amount).toLocaleString()} {o.fiat}</small></span><span><b>{o.status}</b><small>{new Date(o.created_at).toLocaleString()}</small></span><span className={s.actions}><button onClick={()=>run('admin_set_p2p_order_status',{p_id:o.id,p_status:'PAID'},'주문이 PAID 상태로 변경되었습니다.')}>결제확인</button><button onClick={()=>run('admin_set_p2p_order_status',{p_id:o.id,p_status:'RELEASED'},'주문이 RELEASED 상태로 변경되었습니다.')}>완료</button><button onClick={()=>run('admin_set_p2p_order_status',{p_id:o.id,p_status:'DISPUTED'},'분쟁 상태로 변경되었습니다.')}>분쟁</button><button onClick={()=>run('admin_set_p2p_order_status',{p_id:o.id,p_status:'CANCELLED'},'주문이 취소되었습니다.')}>취소</button></span></div>):<div className={s.empty}>P2P 주문이 없습니다.</div>}</div></section>}
  {msg&&<div className={s.toast} onClick={()=>setMsg('')}>{msg}</div>}
 </div></main>
}
