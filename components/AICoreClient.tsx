'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import styles from './AICore.module.css';

type Strategy={id:string;code:string;name:string;description:string;risk_level:number;risk_code:string|null;allowed_assets:string[];trading_frequency:string;max_exposure:number;default_max_loss:number;max_positions:number;status:string};
type Version={id:string;strategy_id:string;version:string;risk_level:number;risk_label:string;allowed_markets:string[];allowed_directions:string[];max_exposure:number;default_max_loss:number;max_positions:number;trading_frequency:string;status:string};
type CoreState={session_id?:string;status?:string;mode?:string;initial_capital?:number;current_value?:number;realized_pnl?:number;unrealized_pnl?:number;total_pnl?:number;roi?:number;drawdown?:number;open_positions?:number;exposure_value?:number;risk_score?:number|null;risk_event?:string|null;agents?:AgentEvent[];strategy_id?:string;strategy_version_id?:string;direction_preference?:string;max_loss?:number;max_positions?:number;exposure_limit?:number;started_at?:string};
type Position={id:string;symbol:string;direction:string;quantity:number;entry_price:number;mark_price:number;realized_pnl:number;unrealized_pnl:number;leverage:number;exposure_value:number;status:string;opened_at:string|null};
type Snapshot={id:string;captured_at:string;total_value:number;roi:number;drawdown:number};
type Feed={id:string;event_type:string;title:string;message:string;created_at:string};
type Agent={id:string;code:string;name:string;description:string};
type AgentEvent={agent_id:string;status:string;confidence:number|null;risk_score:number|null;market_bias:string|null;exposure:number|null;volatility:number|null;created_at:string};

const money=(v:number|undefined)=>Number(v||0).toLocaleString(undefined,{maximumFractionDigits:2});
const pct=(v:number|undefined)=>`${(Number(v||0)*100).toFixed(2)}%`;
const directions=[['AUTO','AI AUTO'],['BULLISH','BULLISH'],['BALANCED','BALANCED'],['DEFENSIVE','DEFENSIVE'],['BEARISH','BEARISH']];
const amounts=[100,500,1000,3000,5000,10000];

export default function AICoreClient(){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [strategies,setStrategies]=useState<Strategy[]>([]);
  const [versions,setVersions]=useState<Version[]>([]);
  const [agents,setAgents]=useState<Agent[]>([]);
  const [core,setCore]=useState<CoreState>({});
  const [positions,setPositions]=useState<Position[]>([]);
  const [snaps,setSnaps]=useState<Snapshot[]>([]);
  const [feed,setFeed]=useState<Feed[]>([]);
  const [balance,setBalance]=useState<number|null>(null);
  const [loggedIn,setLoggedIn]=useState(false);
  const [amount,setAmount]=useState(1000);
  const [custom,setCustom]=useState('');
  const [strategyId,setStrategyId]=useState('');
  const [direction,setDirection]=useState('AUTO');
  const [maxLoss,setMaxLoss]=useState(10);
  const [maxPositions,setMaxPositions]=useState(3);
  const [exposure,setExposure]=useState(70);
  const [confirming,setConfirming]=useState(false);
  const [notice,setNotice]=useState('');

  const loadCatalog=useCallback(async()=>{
    const [{data:s},{data:v},{data:a}]=await Promise.all([
      supabase.from('ai_strategies').select('id,code,name,description,risk_level,risk_code,allowed_assets,trading_frequency,max_exposure,default_max_loss,max_positions,status').in('code',['AI_BALANCE','AI_MOMENTUM','AI_DEFENSE','AI_AGGRESSIVE','AI_QUANT']).eq('status','ACTIVE').order('risk_level'),
      supabase.from('ai_strategy_versions').select('id,strategy_id,version,risk_level,risk_label,allowed_markets,allowed_directions,max_exposure,default_max_loss,max_positions,trading_frequency,status').eq('status','ACTIVE'),
      supabase.from('ai_agents').select('id,code,name,description').eq('active',true)
    ]);
    setStrategies((s||[]) as Strategy[]); setVersions((v||[]) as Version[]); setAgents((a||[]) as Agent[]);
    if(!strategyId && s?.[0]?.id)setStrategyId(s[0].id);
  },[supabase,strategyId]);

  const loadUser=useCallback(async()=>{
    const {data:{user}}=await supabase.auth.getUser(); setLoggedIn(!!user);
    if(!user){setBalance(null);setCore({});return;}
    const [{data:b},{data:c}]=await Promise.all([
      supabase.from('demo_balances').select('available').eq('user_id',user.id).eq('asset','USDT').maybeSingle(),
      supabase.rpc('get_my_ai_core_state')
    ]);
    setBalance(b?Number(b.available):0); setCore((c||{}) as CoreState);
    if(c?.session_id){
      const sid=c.session_id as string;
      const [{data:p},{data:ss},{data:f}]=await Promise.all([
        supabase.from('ai_positions').select('id,symbol,direction,quantity,entry_price,mark_price,realized_pnl,unrealized_pnl,leverage,exposure_value,status,opened_at').eq('session_id',sid).in('status',['OPENING','OPEN','REDUCING','CLOSING']).order('opened_at',{ascending:false}),
        supabase.from('ai_portfolio_snapshots').select('id,captured_at,total_value,roi,drawdown').eq('session_id',sid).order('captured_at',{ascending:true}).limit(120),
        supabase.from('ai_activity_feed').select('id,event_type,title,message,created_at').eq('session_id',sid).order('created_at',{ascending:false}).limit(30)
      ]);
      setPositions((p||[]) as Position[]);setSnaps((ss||[]) as Snapshot[]);setFeed((f||[]) as Feed[]);
    } else {setPositions([]);setSnaps([]);setFeed([]);}
  },[supabase]);

  useEffect(()=>{loadCatalog();loadUser();},[loadCatalog,loadUser]);
  useEffect(()=>{const id=setInterval(()=>{loadUser();},10000);return()=>clearInterval(id)},[loadUser]);

  const selectedAmount=custom?Number(custom):amount;
  const selectedStrategy=strategies.find(x=>x.id===strategyId)||null;
  const selectedVersion=versions.filter(v=>v.strategy_id===strategyId).sort((a,b)=>b.version.localeCompare(a.version,undefined,{numeric:true}))[0]||null;
  const active=!!core.session_id;

  async function start(){
    if(!loggedIn){setNotice('로그인 후 AI CORE를 시작할 수 있습니다.');return;}
    if(!selectedVersion||!selectedAmount){setNotice('전략과 투자금을 확인해주세요.');return;}
    setNotice('');
    const {error}=await supabase.rpc('start_demo_ai_session',{p_strategy_version_id:selectedVersion.id,p_amount:selectedAmount,p_direction:direction,p_max_loss:maxLoss/100,p_max_positions:maxPositions,p_exposure_limit:exposure/100,p_idempotency_key:`web-${crypto.randomUUID()}`,p_terms_version:'v1'});
    setConfirming(false);
    if(error){setNotice(error.message.includes('DEMO_USDT_BALANCE_NOT_FOUND')?'DEMO USDT 잔액이 없습니다. 실제 잔액이 준비된 후 시작할 수 있습니다.':error.message.includes('INSUFFICIENT')?'DEMO USDT 사용 가능 잔액이 부족합니다.':error.message);return;}
    setNotice('AI CORE DEMO 세션이 서버에서 시작되었습니다.'); await loadUser();
  }
  async function pause(){if(!core.session_id)return;const {error}=await supabase.rpc('pause_ai_session',{p_session_id:core.session_id});if(error)setNotice(error.message);else{setNotice('AI CORE가 일시정지되었습니다. 신규 주문이 중지됩니다.');await loadUser();}}
  async function resume(){if(!core.session_id)return;const {error}=await supabase.rpc('resume_ai_session',{p_session_id:core.session_id});if(error)setNotice(error.message);else{setNotice('AI CORE가 재개되었습니다.');await loadUser();}}
  async function stop(){if(!core.session_id)return;const {error}=await supabase.rpc('stop_demo_ai_session',{p_session_id:core.session_id,p_stop_mode:'CLOSE_WHEN_READY'});if(error)setNotice(error.message);else{setNotice('중지 요청이 서버에 반영되었습니다. 미결 주문/포지션이 있으면 정리 후 종료됩니다.');await loadUser();}}

  const latestAgents=core.agents||[];
  const agentStatus=(agentId:string)=>latestAgents.find(a=>a.agent_id===agentId);
  const confidences=latestAgents.map(a=>a.confidence).filter((v):v is number=>v!==null&&v!==undefined);
  const avgConfidence=confidences.length?confidences.reduce((a,b)=>a+b,0)/confidences.length:null;
  const marketAgent=agents.find(a=>a.code==='MARKET');
  const marketBias=marketAgent?agentStatus(marketAgent.id)?.market_bias:null;

  return <main className={styles.page}>
    <section className={styles.hero}><div className={styles.heroCopy}><span>BITMATE AI ASSET MANAGEMENT</span><h1>AI CORE</h1><p>시장 데이터, 전략, 리스크, 포트폴리오, 주문 실행을 분리한 미래형 자동운용 시스템입니다. 실제 저장된 포지션과 서버 계산 결과만 손익에 반영합니다.</p><div className={styles.heroBadges}><b>24/7 MARKET ANALYSIS</b><b>{agents.length} AGENTS CONNECTED</b><b>SYSTEM STATUS · NORMAL</b></div></div><div className={`${styles.coreVisual} ${active?styles.activeCore:''}`}><div className={styles.ringA}/><div className={styles.ringB}/><div className={styles.ringC}/><div className={styles.coreCenter}><span>{active?core.status:'ONLINE'}</span><b>AI</b><small>CORE</small></div><i/><i/><i/><i/></div></section>
    {!active?<><section className={styles.steps}><article><b>01</b><h3>투자금 선택</h3><p>사용 가능한 DEMO USDT 범위에서 선택합니다.</p></article><article><b>02</b><h3>AI 전략 선택</h3><p>Risk와 시장 성격을 보고 전략을 고릅니다.</p></article><article><b>03</b><h3>AI 시작</h3><p>Max Loss와 방향성을 확인한 뒤 서버에서 세션을 생성합니다.</p></article></section><section className={styles.launchGrid}><div className={styles.panel}><div className={styles.sectionHead}><span>STEP 1</span><h2>투자금</h2><em>사용 가능 {balance===null?'—':`${money(balance)} USDT`}</em></div><div className={styles.amounts}>{amounts.map(v=><button className={!custom&&amount===v?styles.selected:''} onClick={()=>{setCustom('');setAmount(v)}} key={v}>{v.toLocaleString()} USDT</button>)}</div><input value={custom} onChange={e=>setCustom(e.target.value)} type="number" min="1" placeholder="직접 입력 (USDT)"/></div><div className={styles.panel}><div className={styles.sectionHead}><span>STEP 2</span><h2>운용 방향</h2></div><div className={styles.biasGrid}>{directions.map(([v,l])=><button className={direction===v?styles.selected:''} onClick={()=>setDirection(v)} key={v}><b>{l}</b><small>{v==='AUTO'?'시장 상황에 따라 서버 전략이 최종 판단':'전략 허용 범위 안에서 우선 방향 반영'}</small></button>)}</div></div></section><section className={styles.strategySection}><div className={styles.title}><span>AI STRATEGIES</span><h2>전략을 선택하세요.</h2><p>성과 데이터가 없는 항목은 임의 숫자를 만들지 않고 `—`로 표시합니다.</p></div><div className={styles.strategyGrid}>{strategies.map(s=><button className={`${styles.strategyCard} ${strategyId===s.id?styles.strategySelected:''}`} onClick={()=>setStrategyId(s.id)} key={s.id}><span>{s.risk_code||'RISK'}</span><h3>{s.name}</h3><p>{s.description}</p><dl><div><dt>30D ROI</dt><dd>—</dd></div><div><dt>MDD</dt><dd>—</dd></div><div><dt>Win Rate</dt><dd>—</dd></div><div><dt>Frequency</dt><dd>{s.trading_frequency}</dd></div><div><dt>Markets</dt><dd>{s.allowed_assets.join(' · ')}</dd></div><div><dt>AI Confidence</dt><dd>—</dd></div></dl></button>)}</div></section><section className={styles.riskSetup}><div><span>STEP 3 · RISK ENGINE</span><h2>위험한도 설정</h2><p>Max Loss에 도달하면 신규 주문을 중지하는 서버 상태 `RISK_STOP`을 사용할 수 있도록 설계돼 있습니다.</p></div><label>Max Loss <select value={maxLoss} onChange={e=>setMaxLoss(Number(e.target.value))}><option>5</option><option>10</option><option>15</option><option>20</option></select><b>{maxLoss}%</b></label><label>Max Open Positions <input type="number" min="1" max="50" value={maxPositions} onChange={e=>setMaxPositions(Number(e.target.value))}/></label><label>Maximum Exposure <input type="range" min="10" max="100" step="5" value={exposure} onChange={e=>setExposure(Number(e.target.value))}/><b>{exposure}%</b></label><button onClick={()=>setConfirming(true)}>AI 운용 시작</button></section></>:<><section className={styles.dashboardTop}><div className={styles.valuePanel}><span>● AI CORE {core.status}</span><small>현재 평가금액</small><strong>{money(core.current_value)} USDT</strong><div><b className={(core.total_pnl||0)>=0?styles.positive:styles.negative}>{(core.total_pnl||0)>=0?'+':''}{money(core.total_pnl)} USDT</b><em className={(core.roi||0)>=0?styles.positive:styles.negative}>{(core.roi||0)>=0?'+':''}{pct(core.roi)}</em></div><Link href="/ai-core/portfolio">My AI Portfolio →</Link></div><div className={styles.metricPanel}><div><span>TODAY ROI</span><b>—</b></div><div><span>7D ROI</span><b>—</b></div><div><span>30D ROI</span><b>—</b></div><div><span>TOTAL ROI</span><b className={(core.roi||0)>=0?styles.positive:styles.negative}>{pct(core.roi)}</b></div><div><span>Risk Score</span><b>{core.risk_score??'—'}</b></div><div><span>AI Confidence</span><b>{avgConfidence===null?'—':pct(avgConfidence)}</b></div><div><span>Market Bias</span><b>{marketBias||'—'}</b></div><div><span>Open Positions</span><b>{core.open_positions||0}</b></div></div></section><section className={styles.activeGrid}><div className={styles.panel}><div className={styles.sectionHead}><span>AI EQUITY CURVE</span><h2>Portfolio Value</h2></div><EquityCurve snapshots={snaps}/></div><div className={styles.panel}><div className={styles.sectionHead}><span>MULTI-AGENT</span><h2>Agent Network</h2></div><div className={styles.agentList}>{agents.map(a=>{const ev=agentStatus(a.id);return <article key={a.id}><div><b>{a.name}</b><small>{a.description}</small></div><em>{ev?.status||'WAITING'}</em><span>{ev?.confidence==null?'Signal —':`Confidence ${pct(ev.confidence)}`}</span></article>})}</div></div><div className={styles.panel}><div className={styles.sectionHead}><span>AI LIVE FEED</span><h2>Activity</h2></div><div className={styles.feed}>{feed.length?feed.map(x=><article key={x.id}><time>{new Date(x.created_at).toLocaleTimeString()}</time><div><b>{x.title}</b><p>{x.message}</p></div></article>):<p className={styles.empty}>실제 전략 이벤트가 기록되면 여기에 표시됩니다.</p>}</div></div></section><section className={styles.positions}><div className={styles.sectionHead}><span>OPEN POSITIONS</span><h2>실시간 포지션</h2></div>{positions.length?<div className={styles.positionTable}><div><b>상품</b><b>방향</b><b>Entry</b><b>Current</b><b>PnL</b><b>Status</b></div>{positions.map(p=><div key={p.id}><span>{p.symbol}</span><span>{p.direction}</span><span>{money(p.entry_price)}</span><span>{money(p.mark_price)}</span><span className={Number(p.unrealized_pnl)>=0?styles.positive:styles.negative}>{money(p.unrealized_pnl)} USDT</span><span>{p.status}</span></div>)}</div>:<p className={styles.empty}>현재 열린 포지션이 없습니다. 프론트에서 임의 포지션을 생성하지 않습니다.</p>}</section><section className={styles.controlBar}><div><b>AI CORE CONTROL</b><span>Pause는 신규 주문을 중지합니다. Stop은 현재 주문/포지션 상태를 확인한 뒤 종료합니다.</span></div>{core.status==='PAUSED'?<button onClick={resume}>재개</button>:<button onClick={pause}>일시정지</button>}<button className={styles.danger} onClick={stop}>AI 운용 중지</button></section></>}
    {notice&&<div className={styles.toast}>{notice}</div>}{confirming&&selectedStrategy&&selectedVersion&&<div className={styles.modalBack}><div className={styles.modal}><span>CONFIRM AI CORE</span><h2>AI 운용 시작 확인</h2><dl><div><dt>AI Strategy</dt><dd>{selectedStrategy.name} v{selectedVersion.version}</dd></div><div><dt>투자금</dt><dd>{money(selectedAmount)} USDT</dd></div><div><dt>Risk</dt><dd>{selectedVersion.risk_label}</dd></div><div><dt>Market Bias</dt><dd>{direction}</dd></div><div><dt>Max Loss Limit</dt><dd>{maxLoss}%</dd></div><div><dt>Trading Frequency</dt><dd>{selectedVersion.trading_frequency}</dd></div></dl><p>AI 기반 전략 역시 손실이 발생할 수 있으며 과거 성과는 미래 수익을 보장하지 않습니다.</p><label className={styles.agree}><input type="checkbox" id="aiAgree"/> AI 운용의 손실 가능성을 확인했습니다.</label><div><button onClick={()=>setConfirming(false)}>취소</button><button onClick={()=>{const el=document.getElementById('aiAgree') as HTMLInputElement|null;if(!el?.checked){setNotice('손실 가능성 확인이 필요합니다.');return;}start();}}>AI CORE 시작</button></div></div></div>}</main>;
}

function EquityCurve({snapshots}:{snapshots:Snapshot[]}){if(snapshots.length<2)return <div className={styles.emptyChart}>실제 Portfolio Snapshot이 2개 이상 쌓이면 자산곡선이 표시됩니다.</div>;const vals=snapshots.map(s=>Number(s.total_value));const min=Math.min(...vals),max=Math.max(...vals);const span=Math.max(max-min,1);const points=snapshots.map((s,i)=>`${(i/(snapshots.length-1))*100},${95-((Number(s.total_value)-min)/span)*85}`).join(' ');return <svg className={styles.chart} viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="aiCurve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#49dcff" stopOpacity=".45"/><stop offset="1" stopColor="#49dcff" stopOpacity="0"/></linearGradient></defs><polyline points={points} fill="none" stroke="#49dcff" strokeWidth="1.8" vectorEffect="non-scaling-stroke"/><polygon points={`0,100 ${points} 100,100`} fill="url(#aiCurve)"/></svg>}
