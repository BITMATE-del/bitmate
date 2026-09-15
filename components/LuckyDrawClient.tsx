'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import styles from './LuckyDraw.module.css';

type Dashboard={season?:{id:string;name:string;starts_at:string;ends_at:string}|null;wallet?:{total_earned?:number;available_balls?:number;used_balls?:number;expired_balls?:number};metrics?:{eligible_deposit?:number;eligible_volume?:number;qualified_referrals?:number;first_deposit_awarded?:boolean;referral_first_awarded?:boolean;volume_10k_awarded?:boolean};today_draws?:number;total_win?:number};
type Draw={id:string;draw_id:string;prize_amount:number|null;status:string;created_at:string;draw_hash:string|null};
type BallEvent={id:string;source_type:string;balls_granted:number;created_at:string};
type DrawResult={draw_id:string;prize_amount:number;reward_status?:string;draw_hash?:string};
const fmt=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(n||0));
const progress=(v:number,target:number)=>Math.min(100,Math.max(0,target?((v%target)/target)*100:0));

export default function LuckyDrawClient(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false); const [dashboard,setDashboard]=useState<Dashboard>({}); const [history,setHistory]=useState<Draw[]>([]); const [events,setEvents]=useState<BallEvent[]>([]); const [message,setMessage]=useState(''); const [result,setResult]=useState<DrawResult|null>(null); const [published,setPublished]=useState(false);
 async function load(){setLoading(true);setMessage('');const {data:{user}}=await supabase.auth.getUser();if(!user){setMessage('Lucky Draw를 이용하려면 로그인하세요.');setLoading(false);return;}const [{data:d,error:de},{data:h},{data:e},{data:v}]=await Promise.all([supabase.rpc('get_lucky_draw_dashboard'),supabase.from('lucky_draw_draws').select('id,draw_id,prize_amount,status,created_at,draw_hash').order('created_at',{ascending:false}).limit(12),supabase.from('lucky_draw_ball_events').select('id,source_type,balls_granted,created_at').order('created_at',{ascending:false}).limit(8),supabase.from('lucky_draw_probability_versions').select('id').eq('status','PUBLISHED').lte('effective_from',new Date().toISOString()).limit(1)]);if(de)setMessage(de.message);setDashboard((d||{}) as Dashboard);setHistory((h||[]) as Draw[]);setEvents((e||[]) as BallEvent[]);setPublished((v||[]).length>0);setLoading(false);}
 useEffect(()=>{load();},[]);
 async function drawOne(){setBusy(true);setResult(null);setMessage('');const key=`draw:${crypto.randomUUID()}`;const {data,error}=await supabase.rpc('lucky_draw_draw',{p_idempotency_key:key});if(error){setMessage(error.message);setBusy(false);await load();return;}setTimeout(()=>{setResult(data as DrawResult);setBusy(false);load();},1000);}
 async function drawAll(){setBusy(true);setResult(null);setMessage('');const key=`batch:${crypto.randomUUID()}`;const {data,error}=await supabase.rpc('lucky_draw_all',{p_batch_key:key});if(error){setMessage(error.message);setBusy(false);await load();return;}const rows=((data as any)?.results||[]) as DrawResult[];const total=rows.reduce((s,x)=>s+Number(x.prize_amount||0),0);setTimeout(()=>{setResult({draw_id:`${rows.length} DRAWS`,prize_amount:total,reward_status:'PENDING'});setBusy(false);load();},1200);}
 const w=dashboard.wallet||{};const m=dashboard.metrics||{};const dep=Number(m.eligible_deposit||0);const vol=Number(m.eligible_volume||0);const balls=Number(w.available_balls||0);const drawDisabled=busy||balls<1||!published;
 const statRows=[['보유 Lucky Ball',balls],['오늘 사용한 Ball',dashboard.today_draws||0],['누적 획득 Ball',w.total_earned||0],['누적 당첨금',`${fmt(Number(dashboard.total_win||0))} USDT`]];
 const progressRows:[string,number,string][]= [
  ['첫 예치 완료',m.first_deposit_awarded?100:dep>0?100:0,m.first_deposit_awarded?'완료':dep>0?'달성':'미달성'],
  ['누적 입금 5,000 USDT',progress(dep,5000),`${fmt(dep%5000)} / 5,000 USDT`],
  ['추천 1명 달성',m.referral_first_awarded?100:Math.min(100,Number(m.qualified_referrals||0)*100),`${m.qualified_referrals||0} / 1`],
  ['누적 거래량 10,000 USDT',m.volume_10k_awarded?100:Math.min(100,vol/10000*100),`${fmt(Math.min(vol,10000))} / 10,000 USDT`],
  ['다음 50,000 USDT 거래량',progress(vol,50000),`${fmt(vol%50000)} / 50,000 USDT`]
 ];
 return <main className={styles.page}><div className="xtShell">
  <section className={styles.hero}>
   <div className={styles.copy}>
    <span className={styles.eyebrow}>LUCKY DRAW</span>
    <h1 className={styles.title}>활동할수록 쌓이는<br/>Lucky Draw 기회</h1>
    <p className={styles.desc}>입금, 거래, 추천 조건을 달성해 Lucky Draw Ball을 획득하고 서버 추첨 결과를 확인하세요. 완료된 추첨 결과는 변경되지 않습니다.</p>
    <div className={styles.actions}>
     <button disabled={drawDisabled} onClick={drawOne} className={styles.assetButton}><img src="/lucky-draw/05-primary-button.svg" alt=""/><span>1회 추첨</span></button>
     <button disabled={drawDisabled} onClick={drawAll} className={`${styles.assetButton} ${styles.assetButtonSecondary}`}><img src="/lucky-draw/06-secondary-button.svg" alt=""/><span>전체 Ball 추첨</span></button>
    </div>
    {!published&&<p className={styles.warning}>운영 확률이 활성화되면 추첨 버튼을 사용할 수 있습니다.</p>}
    {message&&<p className={styles.error}>{message}</p>}
   </div>

   <div className={`${styles.heroPanel} ${busy?styles.busy:''}`}>
    <img className={styles.mainPanel} src="/lucky-draw/01-main-panel.svg" alt=""/>
    <img className={styles.orbit} src="/lucky-draw/02-orbit-counter.svg" alt=""/>
    <img className={styles.cornerGlow} src="/lucky-draw/10-corner-glow.svg" alt=""/>
    <div className={styles.ballBadge}><img src="/lucky-draw/03-ball-badge.svg" alt="Lucky Draw Ball"/><b>B</b></div>
    <div className={styles.ballCount}><small>보유 LUCKY DRAW BALL</small><strong>{loading?'—':`${balls} BALL${balls===1?'':'S'}`}</strong><span>{dashboard.season?.name||'현재 진행 중인 시즌이 없습니다.'}</span></div>
    <div className={styles.statusPill}><img src="/lucky-draw/04-status-pill.svg" alt=""/><span>{busy?'추첨 진행 중':'SERVER DRAW READY'}</span></div>
   </div>
  </section>

  {result&&<section className={styles.result}><small>DRAW RESULT</small><h2>+{fmt(result.prize_amount)} USDT</h2><p>Draw ID · {result.draw_id} · 지급 상태 {result.reward_status||'PENDING'}</p></section>}

  <section className={styles.stats}>{statRows.map(([k,v])=><div key={String(k)} className={styles.statCard}><img src="/lucky-draw/07-mini-stat-card.svg" alt=""/><div className={styles.statText}><small>{k}</small><b>{String(v)}</b></div></div>)}</section>

  <section className={styles.contentGrid}>
   <div className={styles.panel}><h2>Ball 획득 현황</h2>{progressRows.map(([name,p,label])=><div key={name} className={styles.progressRow}><div className={styles.progressTop}><b>{name}</b><span>{label}</span></div><div className={styles.track}><div style={{width:`${Number(p)}%`}}/></div></div>)}</div>
   <div className={styles.panel}><h2>최근 Ball 획득 내역</h2><div>{events.length?events.map(e=><div key={e.id} className={styles.eventRow}><img className={styles.ballIcon} src="/lucky-draw/08-ball-item.svg" alt=""/><span>{e.source_type}</span><b style={{color:e.balls_granted>=0?'#a7ff1a':'#ff6678'}}>{e.balls_granted>=0?'+':''}{e.balls_granted}</b></div>):<p className={styles.empty}>아직 Ball 획득 내역이 없습니다.</p>}</div></div>
  </section>

  <section className={`${styles.panel} ${styles.history}`}><div className={styles.historyTop}><h2>추첨 내역</h2><Link href="/more/lucky-draw">이벤트 안내</Link></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>날짜</th><th>Draw ID</th><th className={styles.right}>당첨금</th><th className={styles.right}>상태</th></tr></thead><tbody>{history.map(h=><tr key={h.id}><td>{new Date(h.created_at).toLocaleString()}</td><td>{h.draw_id}</td><td className={styles.win}>{h.prize_amount==null?'—':`+${fmt(h.prize_amount)} USDT`}</td><td className={styles.right}>{h.status}</td></tr>)}</tbody></table>{!history.length&&<p className={styles.empty}>아직 추첨 내역이 없습니다.</p>}</div></section>
 </div></main>
}
