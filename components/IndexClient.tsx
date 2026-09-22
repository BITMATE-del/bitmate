'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import s from '@/app/crypto-etf/Index.module.css';
import {useUnifiedWalletDisplay} from '@/lib/useUnifiedWalletDisplay';

type Product={id:string;code:string;name:string;description:string;risk_level:string;min_investment:number;max_investment:number|null;rebalance_frequency:string;status:string};
type Version={id:string;product_id:string;version_no:number;label:string;base_nav:number};
type Asset={version_id:string;asset_symbol:string;target_weight:number;base_price:number};
type Perf={product_id:string;index_value:number;total_aum:number;investor_count:number;drawdown:number;captured_at:string};

export default function IndexClient(){
 const wallet=useUnifiedWalletDisplay();
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [products,setProducts]=useState<Product[]>([]),[versions,setVersions]=useState<Version[]>([]),[assets,setAssets]=useState<Asset[]>([]),[perfs,setPerfs]=useState<Perf[]>([]);
 const [risk,setRisk]=useState('ALL'),[modal,setModal]=useState<Product|null>(null),[amount,setAmount]=useState('1000'),[agree,setAgree]=useState(false),[msg,setMsg]=useState('');
 async function load(){
  const [{data:p},{data:v},{data:a},{data:pf},{data:{user}}]=await Promise.all([
   supabase.from('index_products').select('*').order('sort_order'),
   supabase.from('index_product_versions').select('*').eq('status','ACTIVE'),
   supabase.from('index_product_assets').select('*').eq('status','ACTIVE'),
   supabase.from('index_performance_snapshots').select('*').order('captured_at',{ascending:false}).limit(200),
   supabase.auth.getUser()
  ]);
  setProducts((p||[]) as Product[]);setVersions((v||[]) as Version[]);setAssets((a||[]) as Asset[]);setPerfs((pf||[]) as Perf[]);
  
 }
 useEffect(()=>{load()},[]);
 const currentPerf=(pid:string)=>perfs.find(x=>x.product_id===pid);
 const currentVersion=(pid:string)=>versions.filter(v=>v.product_id===pid).sort((a,b)=>b.version_no-a.version_no)[0];
 const productAssets=(pid:string)=>{const v=currentVersion(pid);return v?assets.filter(a=>a.version_id===v.id):[]};
 const filtered=products.filter(p=>risk==='ALL'||p.risk_level===risk);
 async function invest(){
  setMsg(''); if(!modal)return; const n=Number(amount); if(!agree){setMsg('위험 고지에 동의해야 합니다.');return;} if(!Number.isFinite(n)||n<=0){setMsg('투자금을 확인하세요.');return;}
  const {data:{user}}=await supabase.auth.getUser(); if(!user){setMsg('로그인이 필요합니다.');return;}
  const riskVersion='index-risk-v1'; await supabase.from('index_risk_acceptances').upsert({user_id:user.id,version:riskVersion},{onConflict:'user_id,version'});
  const key=crypto.randomUUID(); const {error}=await supabase.rpc('start_index_investment',{p_product_id:modal.id,p_amount:n,p_idempotency_key:key});
  if(error){setMsg(error.message);return;} setMsg('BITMATE INDEX 투자가 완료되었습니다.'); setModal(null);setAgree(false); await load();
 }
 return <main className={s.page}>
  <section className={`${s.shell} ${s.hero}`}><div className={s.heroRow}><div><span className={s.eyebrow}>CRYPTO ETF · BITMATE INDEX</span><h1>여러 자산을 한 번에 나눠 담는 분산투자</h1><p>개별 코인을 하나씩 고르지 않아도, 미리 정해진 비중으로 구성된 Basket에 간편하게 투자할 수 있습니다. 과거 성과는 미래 수익을 보장하지 않습니다.</p></div><div className={s.heroActions}><Link className={s.ghost} href="/crypto-etf/portfolio">My INDEX</Link></div></div></section>
  {msg&&<section className={s.shell}><div className={s.warning}>{msg}</div></section>}
  <section className={s.shell}><div className={s.toolbar}><div className={s.filters}>{['ALL','LOW','MEDIUM','HIGH'].map(x=><button className={risk===x?s.active:''} key={x} onClick={()=>setRisk(x)}>{x==='ALL'?'전체':x}</button>)}</div><span className={s.muted}>실시간 기준가 · 평가손익</span></div>
   <div className={s.grid}>{filtered.map(p=>{const pf=currentPerf(p.id);const pa=productAssets(p.id);return <article className={s.card} key={p.id}><div className={s.cardTop}><div><h3>{p.name}</h3><span className={s.muted}>{p.code}</span></div><span className={s.risk}>{p.risk_level}</span></div><p className={s.desc}>{p.description}</p><div className={s.assets}>{pa.map(a=><span className={s.asset} key={a.asset_symbol}>{a.asset_symbol} {(Number(a.target_weight)*100).toFixed(0)}%</span>)}</div><div className={s.metrics}><div><span>현재 기준가</span><b>{pf?Number(pf.index_value).toFixed(2):'—'}</b></div><div><span>MDD</span><b className={pf&&Number(pf.drawdown)<0?s.down:''}>{pf?`${Number(pf.drawdown).toFixed(2)}%`:'—'}</b></div><div><span>투자자</span><b>{pf?.investor_count??0}</b></div></div><div className={s.cardFoot}><small>최소 {wallet.withUnit(Number(p.min_investment))} · {p.rebalance_frequency}</small><button className={s.btn} onClick={()=>{setModal(p);setAmount(String(p.min_investment));setMsg('')}}>투자하기</button></div></article>})}</div>
  </section>
  {modal&&<div className={s.modalBackdrop} onMouseDown={()=>setModal(null)}><div className={s.modal} onMouseDown={e=>e.stopPropagation()}><h2>{modal.name}</h2><span className={s.muted}>BITMATE INDEX 투자 설정</span><label className={s.field}>투자금 ({wallet.unit})<input value={wallet.currency==='KRW'?(Number.isFinite(wallet.toDisplay(Number(amount)||0))?String(Math.round(wallet.toDisplay(Number(amount)||0))):''):amount} onChange={e=>{const v=Number(e.target.value.replace(/,/g,''));if(!Number.isFinite(v))return;setAmount(String(wallet.fromDisplay(v)))}} inputMode="decimal"/></label><div className={s.preset}>{[100,500,1000,3000,5000].map(x=><button key={x} onClick={()=>setAmount(String(x))}>{wallet.withUnit(x)}</button>)}</div><div className={s.preview}><div><span>사용 가능 잔액</span><b>{wallet.loggedIn?wallet.withUnit(wallet.available):'로그인 필요'}</b></div>{productAssets(modal.id).map(a=><div key={a.asset_symbol}><span>{a.asset_symbol} · {(Number(a.target_weight)*100).toFixed(0)}%</span><b>{wallet.withUnit((Number(amount)||0)*Number(a.target_weight))}</b></div>)}</div><label className={s.check}><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/><span>구성자산 가격 변동에 따라 원금 손실이 발생할 수 있고, 분산투자가 손실 가능성을 제거하지 않는다는 점을 확인했습니다.</span></label>{msg&&<div className={s.warning}>{msg}</div>}<div className={s.modalActions}><button className={s.ghost} onClick={()=>setModal(null)}>취소</button><button className={s.btn} onClick={invest}>투자 시작</button></div></div></div>}
 </main>;
}
