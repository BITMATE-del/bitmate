'use client';

import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import {siteConfirm} from '@/components/SiteDialog';
import s from './P2PMarket.module.css';

type Ad={id:string;user_id:string;asset:string;fiat:string;price:number;available_amount:number;min_order:number;max_order:number;payment_methods:string[];fee_rate:number;headline:string;terms:string;nickname:string|null;bio:string|null;completed_orders:number;status:string;created_at:string};
type Player={id:string;user_id:string;nickname:string;status:string;fee_rate:number;primary_asset:string;payment_methods:string[];min_order:number;max_order:number;bio:string;completed_orders:number};
type Order={id:string;ad_id:string|null;buyer_id:string;seller_id:string;asset:string;fiat:string;price:number;asset_amount:number;fiat_amount:number;payment_method:string|null;status:string;created_at:string;paid_at:string|null;completed_at:string|null;buyer_nickname:string|null;seller_nickname:string|null};
type Message={id:string;sender_id:string;message:string;created_at:string};
type Snapshot={ads:Ad[];my_player:Player|null;my_orders:Order[];my_ads:Ad[]};

const payments=['계좌이체','카카오페이','토스'];
const statusLabel:Record<string,string>={REQUESTED:'거래 요청',ACCEPTED:'판매자 승인',PAID:'입금 완료',RELEASED:'거래 완료',REJECTED:'요청 거절',CANCELLED:'취소',DISPUTED:'분쟁',REFUNDED:'환불'};
const statusStep=(status:string)=>status==='REQUESTED'?1:status==='ACCEPTED'?2:status==='PAID'?3:status==='RELEASED'?4:0;
const money=(v:number)=>Number(v||0).toLocaleString('ko-KR');

export default function P2PMarketClient(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const router=useRouter();
 const [userId,setUserId]=useState<string|null>(null);
 const [data,setData]=useState<Snapshot>({ads:[],my_player:null,my_orders:[],my_ads:[]});
 const [tab,setTab]=useState<'market'|'mine'>('market');
 const [busy,setBusy]=useState(false);
 const [msg,setMsg]=useState('');
 const [applyOpen,setApplyOpen]=useState(false);
 const [adOpen,setAdOpen]=useState(false);
 const [editingAd,setEditingAd]=useState<Ad|null>(null);
 const [orderAd,setOrderAd]=useState<Ad|null>(null);
 const [chatOrder,setChatOrder]=useState<Order|null>(null);
 const [messages,setMessages]=useState<Message[]>([]);
 const [chatText,setChatText]=useState('');
 const [nickname,setNickname]=useState('');
 const [fee,setFee]=useState('0.5');
 const [asset,setAsset]=useState('USDT');
 const [minOrder,setMinOrder]=useState('100000');
 const [maxOrder,setMaxOrder]=useState('5000000');
 const [bio,setBio]=useState('');
 const [payMethods,setPayMethods]=useState<string[]>(['계좌이체']);
 const [price,setPrice]=useState('1500');
 const [available,setAvailable]=useState('1000');
 const [adMin,setAdMin]=useState('100000');
 const [adMax,setAdMax]=useState('5000000');
 const [headline,setHeadline]=useState('빠르고 안전하게 거래합니다');
 const [terms,setTerms]=useState('');
 const [adPayMethods,setAdPayMethods]=useState<string[]>(['계좌이체']);
 const [orderKrw,setOrderKrw]=useState('100000');
 const [orderPayment,setOrderPayment]=useState('계좌이체');

 async function load(){
   const [{data:{user}},{data:snap,error}]=await Promise.all([supabase.auth.getUser(),supabase.rpc('p2p_market_snapshot')]);
   setUserId(user?.id||null);
   if(error){setMsg(error.message);return;}
   setData((snap||{ads:[],my_player:null,my_orders:[],my_ads:[]}) as Snapshot);
 }
 useEffect(()=>{load();const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>load());return()=>subscription.unsubscribe()},[]);

 useEffect(()=>{
   if(!data.my_player)return;
   setNickname(data.my_player.nickname||'');setFee(String(data.my_player.fee_rate??0));setAsset(data.my_player.primary_asset||'USDT');
   setMinOrder(String(data.my_player.min_order||100000));setMaxOrder(String(data.my_player.max_order||5000000));setBio(data.my_player.bio||'');
   setPayMethods(data.my_player.payment_methods?.length?data.my_player.payment_methods:['계좌이체']);
 },[data.my_player?.id]);

 useEffect(()=>{
   if(!chatOrder)return;
   let alive=true;
   const get=async()=>{const {data:m}=await supabase.rpc('p2p_order_messages',{p_order_id:chatOrder.id});if(alive)setMessages((m||[]) as Message[])};
   get();const id=setInterval(get,3000);return()=>{alive=false;clearInterval(id)};
 },[chatOrder?.id,supabase]);

 const toggle=(v:string,list:string[],set:(x:string[])=>void)=>set(list.includes(v)?list.filter(x=>x!==v):[...list,v]);

 async function requireLogin(){
   if(userId)return true;
   const ok=await siteConfirm('P2P 거래를 이용하려면 로그인이 필요합니다.\n로그인 페이지로 이동하시겠습니까?',{title:'로그인이 필요합니다',confirmLabel:'로그인',cancelLabel:'취소'});
   if(ok)router.push('/login');return false;
 }
 async function applyPlayer(){
   if(!await requireLogin())return;setBusy(true);setMsg('');
   const {error}=await supabase.rpc('p2p_apply_player',{p_nickname:nickname,p_fee_rate:Number(fee),p_primary_asset:asset,p_payment_methods:payMethods,p_min_order:Number(minOrder),p_max_order:Number(maxOrder),p_bio:bio});
   setBusy(false);if(error){setMsg(error.message);return}setApplyOpen(false);setMsg('P2P 플레이어 신청이 접수되었습니다.');await load();
 }
 async function createAd(){
   setBusy(true);setMsg('');
   const {error}=await supabase.rpc('p2p_create_ad',{p_price:Number(price),p_available_amount:Number(available),p_min_order:Number(adMin),p_max_order:Number(adMax),p_payment_methods:adPayMethods,p_fee_rate:Number(fee),p_headline:headline,p_terms:terms});
   setBusy(false);if(error){setMsg(error.message);return}setAdOpen(false);setMsg('판매 카드가 등록되었습니다.');await load();
 }
 function openEditAd(ad:Ad){
   setEditingAd(ad);
   setPrice(String(ad.price));
   setAvailable(String(ad.available_amount));
   setAdMin(String(ad.min_order));
   setAdMax(String(ad.max_order));
   setFee(String(ad.fee_rate));
   setHeadline(ad.headline||'');
   setTerms(ad.terms||'');
   setAdPayMethods(ad.payment_methods?.length?ad.payment_methods:['계좌이체']);
 }
 async function updateAd(){
   if(!editingAd)return;
   setBusy(true);setMsg('');
   const {error}=await supabase.rpc('p2p_update_my_ad',{
     p_id:editingAd.id,p_price:Number(price),p_available_amount:Number(available),
     p_min_order:Number(adMin),p_max_order:Number(adMax),p_payment_methods:adPayMethods,
     p_fee_rate:Number(fee),p_headline:headline,p_terms:terms
   });
   setBusy(false);if(error){setMsg(error.message);return}
   setEditingAd(null);setMsg('판매 카드가 수정되었습니다.');await load();
 }
 async function changeAdStatus(ad:Ad,status:'ACTIVE'|'PAUSED'|'CLOSED'){
   setBusy(true);setMsg('');
   const {error}=await supabase.rpc('p2p_set_my_ad_status',{p_id:ad.id,p_status:status});
   setBusy(false);if(error){setMsg(error.message);return}
   setMsg(status==='ACTIVE'?'판매 카드가 다시 노출됩니다.':status==='PAUSED'?'판매 카드 노출을 일시중지했습니다.':'판매 카드를 종료했습니다.');
   await load();
 }
 async function requestTrade(){
   if(!orderAd||!await requireLogin())return;setBusy(true);setMsg('');
   const {error}=await supabase.rpc('p2p_create_order',{p_ad_id:orderAd.id,p_fiat_amount:Number(orderKrw),p_payment_method:orderPayment});
   setBusy(false);if(error){setMsg(error.message);return}setOrderAd(null);setTab('mine');setMsg('거래 요청을 전송했습니다.');await load();
 }
 async function orderAction(order:Order,action:string){
   setBusy(true);setMsg('');const {error}=await supabase.rpc('p2p_order_action',{p_order_id:order.id,p_action:action});setBusy(false);
   if(error){setMsg(error.message);return}await load();
 }
 async function sendMessage(){
   if(!chatOrder||!chatText.trim())return;const value=chatText.trim();setChatText('');
   const {error}=await supabase.rpc('p2p_send_message',{p_order_id:chatOrder.id,p_message:value});
   if(error){setMsg(error.message);return}
   const {data:m}=await supabase.rpc('p2p_order_messages',{p_order_id:chatOrder.id});setMessages((m||[]) as Message[]);
 }

 const playerStatus=data.my_player?.status||null;
 const mineSeller=(o:Order)=>o.seller_id===userId;
 const mineBuyer=(o:Order)=>o.buyer_id===userId;

 return <main className={s.page}>
   <section className={s.hero}><div className={s.shell}>
     <span className={s.eyebrow}>P2P MARKETS</span><h1>P2P Markets</h1>
     <p>회원 간 거래 요청부터 승인, 결제 확인, 완료까지 단계별로 진행합니다.</p>
     <div className={s.heroActions}>
       <button onClick={()=>setTab('market')} className={tab==='market'?s.primary:s.ghost}>판매자 찾기</button>
       <button onClick={async()=>{if(await requireLogin())setTab('mine')}} className={tab==='mine'?s.primary:s.ghost}>내 P2P</button>
       {playerStatus==='APPROVED'?<button className={s.sellerBtn} onClick={()=>setAdOpen(true)}>+ 판매 카드 등록</button>:<button className={s.sellerBtn} onClick={async()=>{if(await requireLogin())setApplyOpen(true)}}>{playerStatus==='PENDING'?'신청정보 보기':'P2P 플레이어 신청'}</button>}
     </div>
   </div></section>

   <div className={s.shell}>
   {tab==='market'?<>
     <section className={s.sectionHead}><div><span>LIVE SELLERS</span><h2>판매자 플레이어</h2></div><p>수수료 · 판매코인 · 결제수단 · 거래한도를 비교하고 거래를 요청하세요.</p></section>
     <section className={s.cards}>
       {data.ads.length?data.ads.map(a=><article key={a.id} className={s.playerCard}>
         <div className={s.cardTop}><div className={s.avatar}>{(a.nickname||'P').slice(0,1).toUpperCase()}</div><div className={s.identity}><b>{a.nickname||'BITMATE Player'}</b></div><span className={s.online}>ACTIVE</span></div>
         <h3>{a.headline||'P2P 판매 플레이어'}</h3>
         <div className={s.cardMetrics}><div><span>판매코인</span><b>{a.asset}</b></div><div><span>판매가격</span><b>{money(a.price)} {a.fiat}</b></div><div><span>수수료</span><b>{Number(a.fee_rate||0).toFixed(2)}%</b></div><div><span>판매가능</span><b>{money(a.available_amount)} {a.asset}</b></div></div>
         <div className={s.limit}><span>거래한도</span><b>{money(a.min_order)} ~ {money(a.max_order)} KRW</b></div>
         <div className={s.payments}>{(a.payment_methods||[]).map(x=><span key={x}>{x}</span>)}</div>
         {a.bio&&<p className={s.bio}>{a.bio}</p>}
         <button className={s.tradeBtn} onClick={async()=>{if(await requireLogin()){setOrderAd(a);setOrderPayment(a.payment_methods?.[0]||'계좌이체');setOrderKrw(String(a.min_order||100000))}}}>거래 요청</button>
       </article>):<div className={s.empty}>현재 등록된 P2P 판매 카드가 없습니다.</div>}
     </section>
   </>:<>
     <section className={s.sectionHead}><div><span>MY P2P</span><h2>내 P2P 관리</h2></div><div className={s.playerState}>{data.my_player?<><span>플레이어 상태</span><b>{data.my_player.status}</b></>:<span>아직 P2P 플레이어 신청 전입니다.</span>}</div></section>

     {data.my_ads.length>0&&<section className={s.myAdsSection}>
       <div className={s.subHead}><div><span>MY SELL CARDS</span><h3>내 판매 카드</h3></div><small>등록한 판매글을 확인하고 수정·일시중지·재노출할 수 있습니다.</small></div>
       <div className={s.myAdsGrid}>
         {data.my_ads.map(a=><article key={a.id} className={s.myAdCard}>
           <div className={s.myAdTop}><div><span>{a.asset} 판매</span><h4>{a.headline||'P2P 판매 카드'}</h4></div><b data-status={a.status}>{a.status}</b></div>
           <div className={s.myAdMetrics}>
             <span>가격 <b>{money(a.price)} KRW</b></span>
             <span>판매가능 <b>{money(a.available_amount)} {a.asset}</b></span>
             <span>수수료 <b>{Number(a.fee_rate||0).toFixed(2)}%</b></span>
             <span>한도 <b>{money(a.min_order)} ~ {money(a.max_order)} KRW</b></span>
           </div>
           <div className={s.myAdActions}>
             <button onClick={()=>openEditAd(a)}>수정</button>
             {a.status==='ACTIVE'&&<button onClick={()=>changeAdStatus(a,'PAUSED')} disabled={busy}>일시중지</button>}
             {a.status==='PAUSED'&&<button className={s.accept} onClick={()=>changeAdStatus(a,'ACTIVE')} disabled={busy}>다시 노출</button>}
             {a.status!=='CLOSED'&&<button className={s.danger} onClick={()=>changeAdStatus(a,'CLOSED')} disabled={busy}>판매 종료</button>}
           </div>
         </article>)}
       </div>
     </section>}

     <section className={s.subHead}><div><span>MY ORDERS</span><h3>내 거래 요청</h3></div></section>
     <section className={s.orderList}>
       {data.my_orders.length?data.my_orders.map(o=>{const step=statusStep(o.status);return <article className={s.orderCard} key={o.id}>
         <div className={s.orderTop}><div><span>{mineSeller(o)?'판매 주문':'구매 주문'}</span><h3>{o.asset} · {money(o.fiat_amount)} {o.fiat}</h3></div><b className={s.status}>{statusLabel[o.status]||o.status}</b></div>
         <div className={s.steps}>{['거래요청','거래승인','입금확인','거래완료'].map((x,i)=><div key={x} className={step>=i+1?s.stepOn:''}><i>{i+1}</i><span>{x}</span></div>)}</div>
         <div className={s.orderInfo}><span>가격 <b>{money(o.price)} KRW</b></span><span>수량 <b>{money(o.asset_amount)} {o.asset}</b></span><span>결제 <b>{o.payment_method||'—'}</b></span></div>
         <div className={s.orderActions}>
           <button onClick={()=>setChatOrder(o)}>개인 대화</button>
           {mineSeller(o)&&o.status==='REQUESTED'&&<><button className={s.accept} disabled={busy} onClick={()=>orderAction(o,'ACCEPT')}>거래 승인</button><button disabled={busy} onClick={()=>orderAction(o,'REJECT')}>거절</button></>}
           {mineBuyer(o)&&o.status==='ACCEPTED'&&<button className={s.accept} disabled={busy} onClick={()=>orderAction(o,'MARK_PAID')}>입금 완료</button>}
           {mineSeller(o)&&o.status==='PAID'&&<button className={s.accept} disabled={busy} onClick={()=>orderAction(o,'RELEASE')}>거래 완료</button>}
           {['REQUESTED','ACCEPTED'].includes(o.status)&&<button disabled={busy} onClick={()=>orderAction(o,'CANCEL')}>취소</button>}
           {['ACCEPTED','PAID'].includes(o.status)&&<button className={s.danger} disabled={busy} onClick={()=>orderAction(o,'DISPUTE')}>분쟁 요청</button>}
         </div>
       </article>}):<div className={s.empty}>진행 중인 P2P 거래가 없습니다.</div>}
     </section>
   </>}
   </div>

   {applyOpen&&<div className={s.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setApplyOpen(false)}}><div className={s.modal}>
     <div className={s.modalHead}><div><span>P2P PLAYER</span><h2>판매자 플레이어 신청</h2></div><button onClick={()=>setApplyOpen(false)}>×</button></div>
     {playerStatus&&<div className={s.currentState}>현재 상태 <b>{playerStatus}</b></div>}
     <div className={s.formGrid}>
       <label>플레이어명<input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="표시할 이름"/></label>
       <label>기본 판매코인<select value={asset} onChange={e=>setAsset(e.target.value)}><option>USDT</option><option>BTC</option><option>ETH</option></select></label>
       <label>기본 수수료 (%)<input inputMode="decimal" value={fee} onChange={e=>setFee(e.target.value)}/></label>
       <label>최소 거래금액 (KRW)<input inputMode="numeric" value={minOrder} onChange={e=>setMinOrder(e.target.value)}/></label>
       <label>최대 거래금액 (KRW)<input inputMode="numeric" value={maxOrder} onChange={e=>setMaxOrder(e.target.value)}/></label>
       <label className={s.full}>플레이어 소개<textarea value={bio} onChange={e=>setBio(e.target.value)} placeholder="구매자에게 보여줄 소개"/></label>
     </div>
     <div className={s.checks}>{payments.map(x=><label key={x}><input type="checkbox" checked={payMethods.includes(x)} onChange={()=>toggle(x,payMethods,setPayMethods)}/>{x}</label>)}</div>
     <div className={s.modalActions}><button onClick={()=>setApplyOpen(false)}>닫기</button><button className={s.primary} disabled={busy} onClick={applyPlayer}>{busy?'처리 중...':'신청 저장'}</button></div>
   </div></div>}

   {adOpen&&<div className={s.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setAdOpen(false)}}><div className={s.modal}>
     <div className={s.modalHead}><div><span>SELL CARD</span><h2>판매 카드 등록</h2></div><button onClick={()=>setAdOpen(false)}>×</button></div>
     <div className={s.formGrid}>
       <label>판매가격 (KRW)<input inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)}/></label>
       <label>판매가능 수량 ({data.my_player?.primary_asset||'USDT'})<input inputMode="decimal" value={available} onChange={e=>setAvailable(e.target.value)}/></label>
       <label>최소 거래금액<input inputMode="numeric" value={adMin} onChange={e=>setAdMin(e.target.value)}/></label>
       <label>최대 거래금액<input inputMode="numeric" value={adMax} onChange={e=>setAdMax(e.target.value)}/></label>
       <label>수수료 (%)<input inputMode="decimal" value={fee} onChange={e=>setFee(e.target.value)}/></label>
       <label className={s.full}>카드 제목<input value={headline} onChange={e=>setHeadline(e.target.value)}/></label>
       <label className={s.full}>거래 조건<textarea value={terms} onChange={e=>setTerms(e.target.value)} placeholder="예: 본인 명의 계좌만 가능"/></label>
     </div>
     <div className={s.checks}>{payments.map(x=><label key={x}><input type="checkbox" checked={adPayMethods.includes(x)} onChange={()=>toggle(x,adPayMethods,setAdPayMethods)}/>{x}</label>)}</div>
     <div className={s.modalActions}><button onClick={()=>setAdOpen(false)}>취소</button><button className={s.primary} disabled={busy} onClick={createAd}>판매 카드 등록</button></div>
   </div></div>}

   {editingAd&&<div className={s.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setEditingAd(null)}}><div className={s.modal}>
     <div className={s.modalHead}><div><span>EDIT SELL CARD</span><h2>판매 카드 수정</h2></div><button onClick={()=>setEditingAd(null)}>×</button></div>
     <div className={s.formGrid}>
       <label>판매가격 (KRW)<input inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)}/></label>
       <label>판매가능 수량 ({editingAd.asset})<input inputMode="decimal" value={available} onChange={e=>setAvailable(e.target.value)}/></label>
       <label>최소 거래금액<input inputMode="numeric" value={adMin} onChange={e=>setAdMin(e.target.value)}/></label>
       <label>최대 거래금액<input inputMode="numeric" value={adMax} onChange={e=>setAdMax(e.target.value)}/></label>
       <label>수수료 (%)<input inputMode="decimal" value={fee} onChange={e=>setFee(e.target.value)}/></label>
       <label className={s.full}>카드 제목<input value={headline} onChange={e=>setHeadline(e.target.value)}/></label>
       <label className={s.full}>거래 조건<textarea value={terms} onChange={e=>setTerms(e.target.value)}/></label>
     </div>
     <div className={s.checks}>{payments.map(x=><label key={x}><input type="checkbox" checked={adPayMethods.includes(x)} onChange={()=>toggle(x,adPayMethods,setAdPayMethods)}/>{x}</label>)}</div>
     <div className={s.modalActions}><button onClick={()=>setEditingAd(null)}>취소</button><button className={s.primary} disabled={busy} onClick={updateAd}>{busy?'저장 중...':'수정 저장'}</button></div>
   </div></div>}

   {orderAd&&<div className={s.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setOrderAd(null)}}><div className={s.modal}>
     <div className={s.modalHead}><div><span>TRADE REQUEST</span><h2>{orderAd.nickname||'판매자'}에게 거래 요청</h2></div><button onClick={()=>setOrderAd(null)}>×</button></div>
     <div className={s.quote}><span>판매코인 <b>{orderAd.asset}</b></span><span>가격 <b>{money(orderAd.price)} KRW</b></span><span>수수료 <b>{Number(orderAd.fee_rate||0).toFixed(2)}%</b></span><span>한도 <b>{money(orderAd.min_order)} ~ {money(orderAd.max_order)}</b></span></div>
     <label className={s.singleField}>구매금액 (KRW)<input inputMode="numeric" value={orderKrw} onChange={e=>setOrderKrw(e.target.value)}/></label>
     <label className={s.singleField}>결제수단<select value={orderPayment} onChange={e=>setOrderPayment(e.target.value)}>{orderAd.payment_methods.map(x=><option key={x}>{x}</option>)}</select></label>
     {orderAd.terms&&<div className={s.terms}><b>판매자 거래 조건</b><p>{orderAd.terms}</p></div>}
     <div className={s.modalActions}><button onClick={()=>setOrderAd(null)}>취소</button><button className={s.primary} disabled={busy} onClick={requestTrade}>거래 요청 보내기</button></div>
   </div></div>}

   {chatOrder&&<div className={s.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setChatOrder(null)}}><div className={s.modal+' '+s.chat}>
     <div className={s.modalHead}><div><span>PRIVATE CHAT</span><h2>{chatOrder.asset} P2P 개인대화</h2></div><button onClick={()=>setChatOrder(null)}>×</button></div>
     <div className={s.chatMeta}><span>{statusLabel[chatOrder.status]||chatOrder.status}</span><b>{money(chatOrder.fiat_amount)} KRW · {money(chatOrder.asset_amount)} {chatOrder.asset}</b></div>
     <div className={s.messages}>{messages.length?messages.map(m=><div key={m.id} className={m.sender_id===userId?s.mineMsg:s.otherMsg}><p>{m.message}</p><small>{new Date(m.created_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</small></div>):<div className={s.chatEmpty}>거래 상대와 대화를 시작하세요.</div>}</div>
     <div className={s.chatInput}><input value={chatText} onChange={e=>setChatText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')sendMessage()}} placeholder="메시지를 입력하세요"/><button onClick={sendMessage}>전송</button></div>
   </div></div>}
   {msg&&<div className={s.toast} onClick={()=>setMsg('')}>{msg}</div>}
 </main>;
}
