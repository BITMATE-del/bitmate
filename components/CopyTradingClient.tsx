'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import s from './CopyTrading.module.css';
import {useUnifiedWalletDisplay} from '@/lib/useUnifiedWalletDisplay';

type Trader={
 id:string;trader_uid:string;nickname:string;avatar_url:string|null;bio:string;grade:string;
 risk_level:'LOW'|'MEDIUM'|'HIGH';products:string[];started_at:string;
 roi_7d:number|null;roi_30d:number|null;roi_90d:number|null;total_roi:number|null;
 mdd:number|null;win_rate:number|null;profit_factor:number|null;trade_count:number|null;followers:number|null;aum:number|null;
};
const pct=(v:number|null|undefined)=>v==null?'—':`${v>=0?'+':''}${Number(v).toFixed(2)}%`;
const num=(v:number|null|undefined)=>v==null?'—':Number(v).toLocaleString(undefined,{maximumFractionDigits:2});

export default function CopyTradingClient(){
 const wallet=useUnifiedWalletDisplay();
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [uid,setUid]=useState('');
 const [trader,setTrader]=useState<Trader|null>(null);
 const [searching,setSearching]=useState(false);
 const [searchMsg,setSearchMsg]=useState('');
 const [selected,setSelected]=useState<Trader|null>(null);
 const [amount,setAmount]=useState('500');
 const [maxLoss,setMaxLoss]=useState('150');
 const [tradeLimit,setTradeLimit]=useState('100');
 const [maxPositions,setMaxPositions]=useState('5');
 const [agree,setAgree]=useState(false);
 const [msg,setMsg]=useState('');

 async function searchTrader(){
  const value=uid.trim();
  setTrader(null);setSearchMsg('');
  if(!value){setSearchMsg('트레이더 UID를 입력해주세요.');return;}
  setSearching(true);
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setSearchMsg('트레이더 UID 검색은 로그인 후 이용할 수 있습니다.');setSearching(false);return;}
  const {data,error}=await supabase.rpc('lookup_copy_trader_by_uid',{p_trader_uid:value});
  setSearching(false);
  if(error){setSearchMsg(error.message==='LOGIN_REQUIRED'?'로그인이 필요합니다.':'트레이더를 검색할 수 없습니다.');return;}
  const row=Array.isArray(data)?data[0]:null;
  if(!row){setSearchMsg('해당 UID로 연결 가능한 트레이더를 찾을 수 없습니다.');return;}
  setTrader(row as Trader);
 }

 async function openCopy(t:Trader){
  setSelected(t);setMsg('');setAgree(false);
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return;
 }

 async function startCopy(){
  if(!selected)return;
  if(!agree){setMsg('위험 고지에 동의해주세요.');return;}
  const a=Number(amount);
  if(!a||a<=0){setMsg('카피 투자금을 확인해주세요.');return;}
  const {error}=await supabase.rpc('start_copy_subscription',{
   p_trader_id:selected.id,p_allocated_amount:a,p_max_copy_amount:a,
   p_trade_amount_limit:Number(tradeLimit)||null,p_max_loss_amount:Number(maxLoss)||null,
   p_daily_loss_limit:null,p_stop_copy_loss_pct:null,p_max_open_positions:Number(maxPositions)||5,
   p_auto_copy:true,p_close_positions_on_stop:false,p_stop_loss_pct:null,p_take_profit_pct:null
  });
  if(error){setMsg(error.message);return;}
  setMsg('카피트레이딩 연동이 시작되었습니다.');
  setTimeout(()=>setSelected(null),900);
 }

 return <main className={s.page}>
  <section className={`${s.shell} ${s.hero}`}>
   <div className={s.heroTop}>
    <div>
     <span className={s.eyebrow}>COPY TRADING</span>
     <h1>트레이더 UID로<br/>직접 찾아 연동하세요.</h1>
     <p>BITMATE는 트레이더 목록, 추천 랭킹 또는 공개된 검증 트레이더를 제공하지 않습니다. 연동하려는 트레이더의 UID를 정확히 알고 있는 경우에만 검색하고 카피를 시작할 수 있습니다.</p>
    </div>
    <Link className={s.btn} href="/my-copy">My Copy Trading</Link>
   </div>
  </section>

  <section className={s.shell} style={{paddingTop:'10px',paddingBottom:'80px'}}>
   <div className={s.panel} style={{maxWidth:'860px',margin:'0 auto',padding:'28px'}}>
    <span className={s.eyebrow}>TRADER UID SEARCH</span>
    <h2 style={{margin:'8px 0 8px'}}>연동할 트레이더 찾기</h2>
    <p className={s.muted} style={{marginTop:0}}>트레이더가 직접 전달한 UID를 입력하세요. 닉네임, 수익률, 인기순 검색은 지원하지 않습니다.</p>
    <div style={{display:'flex',gap:'10px',marginTop:'22px',flexWrap:'wrap'}}>
     <input value={uid} onChange={e=>setUid(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==='Enter')searchTrader()}} placeholder="Trader UID 입력" autoComplete="off" spellCheck={false} style={{flex:'1 1 320px',minHeight:'50px',borderRadius:'10px',border:'1px solid #30363a',background:'#0d0f11',color:'#f5f6f7',padding:'0 16px',outline:'none',fontSize:'15px',letterSpacing:'.03em'}}/>
     <button className={s.btn} onClick={searchTrader} disabled={searching} style={{minWidth:'120px'}}>{searching?'검색 중...':'UID 검색'}</button>
    </div>
    {searchMsg&&<p className={s.warning} style={{marginTop:'16px'}}>{searchMsg}</p>}
   </div>

   {trader&&<article className={s.card} style={{maxWidth:'860px',margin:'22px auto 0'}}>
    <div className={s.profile}>
     <div className={s.avatar}>{trader.nickname?.slice(0,1).toUpperCase()}</div>
     <div><h3>{trader.nickname}</h3><small>UID {trader.trader_uid} · {trader.grade||'TRADER'}</small></div>
     <span className={s.risk}>{trader.risk_level}</span>
    </div>
    <div className={s.stats}>
     <div className={s.stat}><span>30D ROI</span><b className={(trader.roi_30d??0)>=0?s.good:s.bad}>{pct(trader.roi_30d)}</b></div>
     <div className={s.stat}><span>MDD</span><b className={s.bad}>{pct(trader.mdd)}</b></div>
     <div className={s.stat}><span>Win Rate</span><b>{pct(trader.win_rate)}</b></div>
     <div className={s.stat}><span>Total Trades</span><b>{trader.trade_count??0}</b></div>
    </div>
    <div className={s.meta}>
     <span>7D {pct(trader.roi_7d)} · 90D {pct(trader.roi_90d)} · Total {pct(trader.total_roi)}</span>
     <span>Profit Factor {num(trader.profit_factor)} · AUM {num(trader.aum)} USDT</span>
     <span>{trader.products?.length?trader.products.join(' · '):'거래 상품 미등록'}</span>
    </div>
    <div className={s.actions}><button className={s.btn} onClick={()=>openCopy(trader)}>이 트레이더와 연동</button></div>
   </article>}

   <div className={s.notice} style={{maxWidth:'860px',margin:'22px auto 0'}}>트레이더 UID를 모르는 경우에는 검색하거나 탐색할 수 없습니다. BITMATE는 특정 트레이더를 추천·보증하지 않습니다.</div>
  </section>

  {selected&&<div className={s.modalBack}><div className={s.modal}>
   <h2>{selected.nickname} 카피 설정</h2>
   <p className={s.muted}>Trader UID · {selected.trader_uid}</p>
   <div className={s.formGrid}>
    <label className={s.field}>카피 투자금 USDT<input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/></label>
    <label className={s.field}>사용 가능 잔액<input value={wallet.loggedIn?wallet.withUnit(wallet.available):'로그인 후 확인'} readOnly/></label>
    <label className={s.field}>거래당 최대 금액<input value={tradeLimit} onChange={e=>setTradeLimit(e.target.value)}/></label>
    <label className={s.field}>최대 손실 금액<input value={maxLoss} onChange={e=>setMaxLoss(e.target.value)}/></label>
    <label className={s.field}>최대 동시 포지션<input value={maxPositions} onChange={e=>setMaxPositions(e.target.value)}/></label>
    <div className={`${s.notice} ${s.full}`}>카피트레이딩은 다른 트레이더의 거래를 참고하여 자동으로 거래를 실행하는 기능이며, 과거의 거래 성과가 미래의 수익을 보장하지 않습니다. 시장 변동에 따라 원금 손실이 발생할 수 있습니다.</div>
    <label className={`${s.field} ${s.full}`}><span><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/> 위험 고지 내용을 확인했습니다.</span></label>
   </div>
   {msg&&<p className={s.warning}>{msg}</p>}
   <div className={s.modalActions}><button className={s.ghost} onClick={()=>setSelected(null)}>취소</button><button className={s.btn} onClick={startCopy}>카피 시작</button></div>
  </div></div>}
 </main>;
}
