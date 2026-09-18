'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {createBrowserSupabase} from '@/lib/supabase-browser';

type Tier={id:string;code:string;name:string;min_principal:number;max_principal:number|null;mining_power:number;sort_order:number};
type Rate={tier_id:string;reward_rate:number;effective_from:string};
type GameState={principal:number;mining_power:number;active_positions:number;mining_days:number;today_reward:number;total_reward:number;level:number;level_name:string;next_settlement:string};
type Position={id:string;principal:number;mining_power:number;tier_id:string;status:string;started_at:string};

const presets=[100,500,1000,3000,5000,10000];

function pct(v:number){return `${(Number(v)*100).toFixed(2)}%`;}
function money(v:number){return Number(v||0).toLocaleString(undefined,{maximumFractionDigits:4});}
function nextSettlementMs(){
  const now=Date.now();
  const kst=new Date(now+9*3600_000);
  const y=kst.getUTCFullYear(),m=kst.getUTCMonth(),d=kst.getUTCDate();
  let target=Date.UTC(y,m,d,0,5,0);
  if(now>=target) target=Date.UTC(y,m,d+1,0,5,0);
  return target;
}
function formatCountdown(ms:number){
  const s=Math.max(0,Math.floor(ms/1000));
  const h=Math.floor(s/3600); const m=Math.floor((s%3600)/60); const sec=s%60;
  return [h,m,sec].map(v=>String(v).padStart(2,'0')).join(':');
}

export default function MiningGame(){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [tiers,setTiers]=useState<Tier[]>([]);
  const [rates,setRates]=useState<Rate[]>([]);
  const [positions,setPositions]=useState<Position[]>([]);
  const [game,setGame]=useState<GameState|null>(null);
  const [loggedIn,setLoggedIn]=useState(false);
  const [amount,setAmount]=useState(1000);
  const [custom,setCustom]=useState('');
  const [countdown,setCountdown]=useState('00:00:00');
  const [pending,setPending]=useState(false);
  const [confirming,setConfirming]=useState(false);
  const [notice,setNotice]=useState('');

  const load=useCallback(async()=>{
    const {data:product}=await supabase.from('mining_products').select('id').eq('code','CORE').maybeSingle();
    if(product){
      const {data:t}=await supabase.from('mining_tiers').select('id,code,name,min_principal,max_principal,mining_power,sort_order').eq('product_id',product.id).eq('active',true).order('sort_order');
      setTiers((t||[]) as Tier[]);
      const ids=(t||[]).map((x:{id:string})=>x.id);
      if(ids.length){
        const {data:r}=await supabase.from('mining_rate_history').select('tier_id,reward_rate,effective_from').in('tier_id',ids).lte('effective_from',new Date().toISOString()).order('effective_from',{ascending:false});
        setRates((r||[]) as Rate[]);
      }
    }
    const {data:{user}}=await supabase.auth.getUser();
    setLoggedIn(!!user);
    if(user){
      const {data:g}=await supabase.rpc('get_my_mining_game_state');
      if(g) setGame(g as GameState);
      const {data:p}=await supabase.from('mining_positions').select('id,principal,mining_power,tier_id,status,started_at').eq('status','MINING').order('started_at',{ascending:false});
      setPositions((p||[]) as Position[]);
    }
  },[supabase]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    const tick=()=>setCountdown(formatCountdown(nextSettlementMs()-Date.now()));
    tick(); const id=setInterval(tick,1000); return()=>clearInterval(id);
  },[]);

  const selectedAmount=custom?Number(custom):amount;
  const tier=tiers.find(t=>selectedAmount>=Number(t.min_principal)&&(t.max_principal==null||selectedAmount<=Number(t.max_principal)))||null;
  const rateFor=(tierId:string)=>rates.find(r=>r.tier_id===tierId)?.reward_rate||0;
  const currentRate=tier?rateFor(tier.id):0;
  const expected=currentRate*selectedAmount;
  const activeExpected=positions.reduce((sum,p)=>sum+(Number(p.principal)*rateFor(p.tier_id)),0);
  const progress=Math.min(99,Math.max(1,Math.round(((24*3600-(nextSettlementMs()-Date.now())/1000)/(24*3600))*100)));

  async function startMining(){
    if(!loggedIn){setNotice('채굴을 시작하려면 먼저 로그인해주세요.');return;}
    if(!tier||!selectedAmount){setNotice('유효한 채굴 금액을 선택해주세요.');return;}
    setPending(true);setNotice('');
    const key=`web-${crypto.randomUUID()}`;
    const {error}=await supabase.rpc('start_demo_mining',{p_amount:selectedAmount,p_idempotency_key:key,p_terms_version:'v1'});
    setPending(false);setConfirming(false);
    if(error){
      setNotice(error.message.includes('INSUFFICIENT_DEMO_USDT_BALANCE')?'USDT 사용 가능 잔액이 부족합니다.':error.message);
      return;
    }
    setNotice('채굴기가 가동되었습니다. Position 생성 및 잔액 잠금이 완료됐습니다.');
    await load();
  }

  const active=(game?.active_positions||0)>0;
  return <main className="miningPage">
    <section className="miningHero"><div className="xtShell miningHeroGrid">
      <div className="miningIntro">
        <span className="miningKicker">BITMATE DIGITAL MINING</span>
        <h1>{active?'MINING ACTIVE':'YOUR MINING CORE'}</h1>
        <p>{active?'채굴기가 정상 가동 중입니다. 확정된 보상은 정산 내역과 잔액에 반영됩니다.':'금액을 선택하고 채굴기를 켜세요. 복잡한 설정 없이 매일 Mining Reward 기록을 확인할 수 있습니다.'}</p>
        <div className="miningKpis">
          <div><span>내 Mining Power</span><b>{money(game?.mining_power||0)} TH/s</b></div>
          <div><span>오늘 보상</span><b>{money(game?.today_reward||0)} USDT</b></div>
          <div><span>누적 보상</span><b>{money(game?.total_reward||0)} USDT</b></div>
          <div><span>다음 정산</span><b>{countdown}</b></div>
        </div>
      </div>

      <div className={active?'miningCore active':'miningCore'}>
        <div className="coreHalo"/><div className="coreRing ringA"/><div className="coreRing ringB"/>
        <div className="coreMachine">
          <div className="coreFan"><i/><i/><i/></div>
          <span>MINING CORE</span>
          <b>LV.{game?.level||1} {game?.level_name||'Starter'}</b>
          <strong>{money(game?.mining_power||0)} TH/s</strong>
          <em>{active?'● MINING ACTIVE':'● CORE STANDBY'}</em>
        </div>
        <div className="energyBar"><div style={{width:`${progress}%`}}/><span>오늘 채굴 진행 {progress}%</span></div>
        <div className="miningCoin coinOne">₿</div><div className="miningCoin coinTwo">◆</div><div className="miningCoin coinThree">B</div>
      </div>
    </div></section>

    <section className="xtShell miningQuickStats">
      <div><span>ACTIVE POSITION</span><b>{game?.active_positions||0}</b></div>
      <div><span>MINING DAYS</span><b>{game?.mining_days||0} DAYS</b></div>
      <div><span>오늘 예상 보상</span><b>{money(activeExpected)} USDT</b></div>
      <div><span>정산 기준</span><b>09:05 KST</b></div>
    </section>

    {!active&&<section className="xtShell miningSteps"><div className="sectionTitle"><span>START IN 3 STEPS</span><h2>채굴은 세 단계면 됩니다.</h2></div><div className="stepGrid"><article><b>01</b><h3>채굴 금액 선택</h3><p>원하는 참여금액을 고릅니다.</p></article><article><b>02</b><h3>채굴기 가동</h3><p>등급과 현재 적용률을 확인합니다.</p></article><article><b>03</b><h3>매일 보상 확인</h3><p>확정된 보상은 History에서 확인할 수 있습니다.</p></article></div></section>}

    <section className="miningControl"><div className="xtShell miningControlGrid">
      <div>
        <span className="sectionLabel">MINING POWER</span><h2>{active?'채굴 파워 추가':'채굴 시작하기'}</h2><p>추가 참여는 기존 Position을 수정하지 않고 새 Position으로 생성되어 참여일·등급·적용률 이력이 분리됩니다.</p>
        <div className="amountGrid">{presets.map(v=><button key={v} className={!custom&&amount===v?'selected':''} onClick={()=>{setCustom('');setAmount(v)}}>{v.toLocaleString()} USDT</button>)}</div>
        <input className="miningCustomInput" type="number" min="100" placeholder="직접 입력 (USDT)" value={custom} onChange={e=>setCustom(e.target.value)}/>
      </div>
      <div className="miningQuote">
        <span>현재 선택</span><strong>{money(selectedAmount)} USDT</strong>
        <dl><div><dt>등급</dt><dd>{tier?.name||'금액을 확인하세요'}</dd></div><div><dt>Mining Power</dt><dd>{tier?`${money(tier.mining_power)} TH/s`:'-'}</dd></div><div><dt>Mining Reward Rate</dt><dd>{tier?pct(currentRate):'-'}</dd></div><div><dt>오늘 예상 Mining Reward</dt><dd>{tier?`${money(expected)} USDT`:'-'}</dd></div><div><dt>다음 정산 예정</dt><dd>내일 09:05 KST</dd></div></dl>
        <button className="limeBtn miningStartBtn" onClick={()=>setConfirming(true)} disabled={!tier}>{active?'채굴 파워 추가':'채굴 시작'}</button>
        <small>고정 수익 보장이 아닙니다. 표시된 보상률은 현재 적용 정책이며 향후 적용일 기준으로 변경될 수 있습니다.</small>
      </div>
    </div></section>

    <section className="xtShell tierSection"><div className="sectionTitle"><span>MINER RANK</span><h2>Mining 등급</h2></div><div className="tierGrid">{tiers.map(t=><article className={tier?.id===t.id?'active':''} key={t.id}><span>{t.code}</span><h3>{t.name}</h3><b>{money(t.mining_power)} TH/s</b><p>{money(t.min_principal)}{t.max_principal?` ~ ${money(t.max_principal)}`:'+'} USDT</p><small>현재 Rate {pct(rateFor(t.id))}</small></article>)}</div></section>

    <section className="xtShell miningMission"><div><span className="sectionLabel">MINING STREAK</span><h2>연속 Mining</h2><p>접속만으로 보상이 생기지 않습니다. ACTIVE Mining 정산일을 기준으로 기록합니다.</p></div><div className="dayTrack">{[1,2,3,4,5,6,7].map(d=><span className={(game?.mining_days||0)%7>=d?'done':''} key={d}>DAY {d}</span>)}</div><Link href="/my-mining" className="secondaryTradeBtn">내 채굴 / History 보기</Link></section>

    {notice&&<div className="miningToast">{notice}</div>}
    {confirming&&tier&&<div className="miningModalBack"><div className="miningModal"><span className="sectionLabel">CONFIRM MINING</span><h2>채굴 시작 확인</h2><dl><div><dt>참여금액</dt><dd>{money(selectedAmount)} USDT</dd></div><div><dt>등급</dt><dd>{tier.name}</dd></div><div><dt>현재 적용 Rate</dt><dd>{pct(currentRate)}</dd></div><div><dt>다음 정산 예정</dt><dd>내일 09:05 KST</dd></div></dl><p>완료된 과거 정산은 향후 Rate 변경으로 소급 수정되지 않습니다.</p><div className="modalActions"><button className="secondaryTradeBtn" onClick={()=>setConfirming(false)}>취소</button><button className="limeBtn" onClick={startMining} disabled={pending}>{pending?'처리 중...':'채굴 시작'}</button></div></div></div>}
  </main>;
}
