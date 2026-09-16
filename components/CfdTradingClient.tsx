'use client';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import s from './CfdTrading.module.css';

type Product={id:string;symbol:string;display_name:string;category:string;current_price:number|null;bid:number|null;ask:number|null;available_leverages:number[];maintenance_margin_rate:number;trading_fee:number;status:string;trading_enabled:boolean;last_price_at:string|null};
type Position={id:string;symbol:string;side:string;status:string;leverage:number;initial_margin:number;remaining_margin:number;position_value:number;remaining_quantity:number;entry_price:number;current_price:number;liquidation_price:number|null;stop_loss:number|null;take_profit:number|null;unrealized_pnl:number;realized_pnl:number;opened_at:string;close_reason?:string|null};
type Order={id:string;symbol:string;side:string;order_type:string;margin:number;leverage:number;position_value:number;quantity:number;execution_price:number|null;fee:number;status:string;created_at:string};
type Execution={id:string;execution_type:string;price:number;quantity:number;gross_pnl:number;fee:number;net_pnl:number;created_at:string};
type BottomTab='open'|'orders'|'trades'|'positions'|'assets';
type BookTab='book'|'recent';

export default function CfdTradingClient(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [products,setProducts]=useState<Product[]>([]),[positions,setPositions]=useState<Position[]>([]),[closed,setClosed]=useState<Position[]>([]),[orders,setOrders]=useState<Order[]>([]),[executions,setExecutions]=useState<Execution[]>([]);
 const [selected,setSelected]=useState<Product|null>(null),[side,setSide]=useState<'LONG'|'SHORT'>('LONG'),[margin,setMargin]=useState('100'),[lev,setLev]=useState(1),[sl,setSl]=useState(''),[tp,setTp]=useState(''),[summary,setSummary]=useState<any>(null),[msg,setMsg]=useState('');
 const [bottomTab,setBottomTab]=useState<BottomTab>('open'),[bookTab,setBookTab]=useState<BookTab>('book'),[ticks,setTicks]=useState<number[]>([]);

 async function load(){
  const {data:{user}}=await supabase.auth.getUser();
  const {data:p}=await supabase.from('cfd_products').select('*').order('sort_order');
  const list=(p||[]) as Product[];
  setProducts(list);
  setSelected(prev=>prev?(list.find(x=>x.id===prev.id)||prev):(list[0]||null));
  if(!user)return;
  await supabase.rpc('ensure_cfd_demo_account');
  const [{data:pos},{data:sum},{data:ord},{data:exec}]=await Promise.all([
   supabase.from('cfd_positions').select('*').order('created_at',{ascending:false}),
   supabase.rpc('get_cfd_account_summary'),
   supabase.from('cfd_orders').select('id,symbol,side,order_type,margin,leverage,position_value,quantity,execution_price,fee,status,created_at').order('created_at',{ascending:false}).limit(100),
   supabase.from('cfd_trade_executions').select('id,execution_type,price,quantity,gross_pnl,fee,net_pnl,created_at').order('created_at',{ascending:false}).limit(100)
  ]);
  const all=(pos||[]) as Position[];
  setPositions(all.filter(x=>['OPEN','PARTIALLY_CLOSED'].includes(x.status)));
  setClosed(all.filter(x=>['CLOSED','LIQUIDATED'].includes(x.status)));
  setSummary(sum);setOrders((ord||[]) as Order[]);setExecutions((exec||[]) as Execution[]);
 }
 useEffect(()=>{load();const id=setInterval(load,5000);return()=>clearInterval(id)},[]);
 useEffect(()=>{if(selected&&!selected.available_leverages.includes(lev))setLev(selected.available_leverages[0]||1)},[selected,lev]);
 useEffect(()=>{setTicks([])},[selected?.id]);
 useEffect(()=>{const v=Number(selected?.current_price);if(!Number.isFinite(v)||v<=0)return;setTicks(prev=>prev[prev.length-1]===v?prev:[...prev.slice(-119),v])},[selected?.current_price]);

 const m=Number(margin)||0, ask=Number(selected?.ask||selected?.current_price||0), bid=Number(selected?.bid||selected?.current_price||0), current=Number(selected?.current_price||0);
 const px=side==='LONG'?ask:bid, posVal=m*lev, fee=selected?posVal*Number(selected.trading_fee):0;
 const liq=selected&&px&&lev?(side==='LONG'?px*(1-1/lev+Number(selected.maintenance_margin_rate)):px*(1+1/lev-Number(selected.maintenance_margin_rate))):0;
 const available=Number(summary?.available_balance)||0;
 const marginPct=available>0?Math.min(100,Math.max(0,m/available*100)):0;
 const spread=ask&&bid?Math.max(0,ask-bid):0;
 const pendingOrders=orders.filter(x=>['PENDING','SUBMITTED','PARTIALLY_FILLED','UNKNOWN'].includes(x.status));
 const chartPath=useMemo(()=>{if(ticks.length<2)return '';const lo=Math.min(...ticks),hi=Math.max(...ticks),span=hi-lo||1;return ticks.map((v,i)=>`${i===0?'M':'L'} ${(i/(ticks.length-1))*100} ${90-((v-lo)/span)*72}`).join(' ')},[ticks]);

 async function order(){setMsg('');if(!selected){setMsg('상품을 선택하세요.');return;}if(m<=0){setMsg('증거금을 확인하세요.');return;}const riskVersion='cfd-risk-v1';const {data:{user}}=await supabase.auth.getUser();if(!user){setMsg('로그인이 필요합니다.');return;}await supabase.from('cfd_risk_acceptances').upsert({user_id:user.id,version:riskVersion},{onConflict:'user_id,version'});const id=crypto.randomUUID();const {error}=await supabase.rpc('open_cfd_market_order',{p_symbol:selected.symbol,p_side:side,p_margin:m,p_leverage:lev,p_stop_loss:sl?Number(sl):null,p_take_profit:tp?Number(tp):null,p_client_order_id:id,p_idempotency_key:id});if(error){setMsg(error.message);return;}setMsg('CFD 시장가 주문이 체결되었습니다.');await load()}
 async function close(id:string,pct:number){if(!confirm(`${pct}% 청산하시겠습니까?`))return;const {error}=await supabase.rpc('close_cfd_position',{p_position_id:id,p_percent:pct});if(error)setMsg(error.message);else{setMsg('청산이 반영되었습니다.');await load()}}
 async function updateStops(p:Position){const nsl=prompt('Stop Loss',p.stop_loss?.toString()||'')??'';const ntp=prompt('Take Profit',p.take_profit?.toString()||'')??'';const {error}=await supabase.rpc('update_cfd_sltp',{p_position_id:p.id,p_stop_loss:nsl?Number(nsl):null,p_take_profit:ntp?Number(ntp):null});if(error)setMsg(error.message);else await load()}

 const fmt=(v:number|null|undefined,d=2)=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});
 const renderPositions=()=> <div className={s.tableWrap}><table className={s.table}><thead><tr><th>종목</th><th>방향</th><th>증거금</th><th>레버리지</th><th>진입가</th><th>현재가</th><th>평가손익</th><th>ROI</th><th>청산가</th><th>SL / TP</th><th>관리</th></tr></thead><tbody>{positions.length?positions.map(p=>{const roi=Number(p.remaining_margin)?Number(p.unrealized_pnl)/Number(p.remaining_margin)*100:0;return <tr key={p.id}><td>{p.symbol}</td><td className={p.side==='LONG'?s.pos:s.neg}>{p.side}</td><td>{fmt(p.remaining_margin)} USDT</td><td>{p.leverage}X</td><td>{fmt(p.entry_price)}</td><td>{fmt(p.current_price)}</td><td className={Number(p.unrealized_pnl)>=0?s.pos:s.neg}>{fmt(p.unrealized_pnl)} USDT</td><td>{roi.toFixed(2)}%</td><td>{fmt(p.liquidation_price)}</td><td>{p.stop_loss||'—'} / {p.take_profit||'—'}</td><td><div className={s.actions}><button className={s.ghost} onClick={()=>updateStops(p)}>SL/TP</button><button className={s.ghost} onClick={()=>close(p.id,25)}>25%</button><button className={s.ghost} onClick={()=>close(p.id,50)}>50%</button><button className={s.ghost} onClick={()=>close(p.id,100)}>전체청산</button></div></td></tr>}):<tr><td colSpan={11} className={s.empty}>열린 포지션이 없습니다.</td></tr>}</tbody></table></div>;

 return <main className={s.page}>
  {msg&&<div className={s.toast}>{msg}</div>}

  <section className={s.marketBar}>
   <div className={s.symbolBox}><select value={selected?.id||''} onChange={e=>{const p=products.find(x=>x.id===e.target.value)||null;setSelected(p);if(p)setLev(p.available_leverages?.[0]||1)}}>{products.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select><span>{selected?.category||'CFD'}</span></div>
   <div className={s.priceBox}><strong>{fmt(current)}</strong><span>{selected?.symbol||'—'}</span></div>
   <div className={s.marketMetric}><span>24시간 변동률</span><b>—</b></div>
   <div className={s.marketMetric}><span>24시간 최고가</span><b>—</b></div>
   <div className={s.marketMetric}><span>24시간 최저가</span><b>—</b></div>
   <div className={s.marketMetric}><span>24시간 거래량</span><b>—</b></div>
   <div className={s.marketMetric}><span>Bid / Ask</span><b>{fmt(bid)} / {fmt(ask)}</b></div>
   <div className={s.marketMetric}><span>업데이트</span><b>{selected?.last_price_at?new Date(selected.last_price_at).toLocaleTimeString():'—'}</b></div>
  </section>

  <section className={s.terminalGrid}>
   <section className={`${s.panel} ${s.chartPanel}`}>
    <div className={s.panelTabs}><div><button className={s.tabActive}>차트</button><button>시장 정보</button></div><div className={s.chartTools}><span>LIVE</span><span>실시간 가격</span></div></div>
    <div className={s.timeframes}><button>1분</button><button>5분</button><button className={s.timeActive}>실시간</button><button>30분</button><button>1시간</button><button>4시간</button><button>1일</button><span className={s.spacer}/><span>현재 데이터 피드 기준</span></div>
    <div className={s.chartHeader}><div><b>{selected?.display_name||'—'} · CFD</b><span className={s.liveDot}/></div><div><span>Bid <b>{fmt(bid)}</b></span><span>Ask <b>{fmt(ask)}</b></span><span>Spread <b>{spread?spread.toFixed(4):'—'}</b></span></div></div>
    <div className={s.chartStage}>
     <div className={s.chartGrid}/>
     {chartPath?<svg className={s.liveChart} viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="cfdFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b7ff2a" stopOpacity=".24"/><stop offset="1" stopColor="#b7ff2a" stopOpacity="0"/></linearGradient></defs><path d={`${chartPath} L 100 100 L 0 100 Z`} fill="url(#cfdFill)"/><path d={chartPath} fill="none" stroke="#b7ff2a" strokeWidth="1.2" vectorEffect="non-scaling-stroke"/></svg>:<div className={s.chartEmpty}><b>{fmt(current)}</b><span>실시간 가격 데이터를 수집하고 있습니다.</span></div>}
     <div className={s.priceMarker}>{fmt(current)}</div>
    </div>
    <div className={s.chartFoot}><span>관측 데이터 {ticks.length}개</span><span>실제 `cfd_products.current_price` 갱신값만 표시</span></div>
   </section>

   <section className={`${s.panel} ${s.bookPanel}`}>
    <div className={s.panelTabs}><div><button onClick={()=>setBookTab('book')} className={bookTab==='book'?s.tabActive:''}>호가</button><button onClick={()=>setBookTab('recent')} className={bookTab==='recent'?s.tabActive:''}>내 최근 체결</button></div></div>
    {bookTab==='book'?<div className={s.bookBody}><div className={s.bookHead}><span>가격</span><span>수량</span><span>누적</span></div><div className={s.askRow}><b>{fmt(ask)}</b><span>—</span><span>—</span></div><div className={s.midPrice}><strong>{fmt(current)}</strong><span>{spread?`Spread ${spread.toFixed(4)}`:'현재가'}</span></div><div className={s.bidRow}><b>{fmt(bid)}</b><span>—</span><span>—</span></div><p className={s.bookNote}>현재 CFD 데이터 소스가 제공하는 실제 Bid / Ask만 표시합니다. 수량 깊이는 임의 생성하지 않습니다.</p></div>:<div className={s.recentList}>{executions.slice(0,12).map(x=><div key={x.id}><span>{new Date(x.created_at).toLocaleTimeString()}</span><b>{fmt(x.price)}</b><span>{fmt(x.quantity,4)}</span></div>)}{!executions.length&&<div className={s.empty}>체결 내역이 없습니다.</div>}</div>}
   </section>

   <section className={`${s.panel} ${s.orderPanel}`}>
    <div className={s.sideRow}><button onClick={()=>setSide('LONG')} className={`${s.long} ${side==='LONG'?s.active:''}`}>매수 · LONG</button><button onClick={()=>setSide('SHORT')} className={`${s.short} ${side==='SHORT'?s.active:''}`}>매도 · SHORT</button></div>
    <div className={s.orderMeta}><span>레버리지</span><div className={s.leverages}>{(selected?.available_leverages||[1]).map(x=><button type="button" className={lev===x?s.active:''} onClick={()=>setLev(x)} key={x}>{x}X</button>)}</div></div>
    <div className={s.orderTypes}><button disabled>지정가</button><button className={s.typeActive}>시장가</button><button disabled>스탑</button><button disabled>스탑·리밋</button></div>
    <div className={s.available}><span>사용 가능</span><b>{fmt(available)} USDT</b></div>
    <label className={s.tradeField}><span>예상 진입가</span><div><input value={px?fmt(px):''} readOnly/><em>USDT</em></div></label>
    <label className={s.tradeField}><span>증거금</span><div><input value={margin} onChange={e=>setMargin(e.target.value)} inputMode="decimal"/><em>USDT</em></div></label>
    <input className={s.range} type="range" min="0" max="100" step="25" value={Math.round(marginPct/25)*25} onChange={e=>{if(available>0)setMargin((available*Number(e.target.value)/100).toFixed(2))}}/>
    <div className={s.rangeLabels}><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
    <label className={s.tradeField}><span>Stop Loss</span><div><input value={sl} onChange={e=>setSl(e.target.value)} placeholder="선택"/><em>USDT</em></div></label>
    <label className={s.tradeField}><span>Take Profit</span><div><input value={tp} onChange={e=>setTp(e.target.value)} placeholder="선택"/><em>USDT</em></div></label>
    <div className={s.preview}><div><span>포지션 가치</span><b>{posVal.toFixed(2)} USDT</b></div><div><span>예상 수수료</span><b>{fee.toFixed(4)} USDT</b></div><div><span>예상 청산가</span><b>{liq?liq.toFixed(2):'—'}</b></div><div><span>마진 모드</span><b>ISOLATED</b></div></div>
    <button className={`${s.primary} ${side==='SHORT'?s.primaryShort:''}`} onClick={order}>{side==='LONG'?'BTC 매수 · LONG':'BTC 매도 · SHORT'} 시장가 주문</button>
    <p className={s.orderNote}>기존 CFD 엔진이 지원하는 시장가 주문 로직을 그대로 사용합니다.</p>
   </section>
  </section>

  <section className={s.accountStrip}>{[['Wallet',summary?.wallet_balance],['Available',summary?.available_balance],['Used Margin',summary?.used_margin],['Unrealized PnL',summary?.unrealized_pnl],['Equity',summary?.equity],['Margin Level',summary?.margin_level==null?'N/A':`${Number(summary.margin_level).toFixed(2)}%`]].map(([k,v])=><div key={k as string}><span>{k}</span><b>{typeof v==='number'?Number(v).toFixed(2):v??'—'}</b></div>)}</section>

  <section className={`${s.panel} ${s.bottomPanel}`}>
   <div className={s.bottomTabs}><button onClick={()=>setBottomTab('open')} className={bottomTab==='open'?s.tabActive:''}>미체결 주문 ({pendingOrders.length})</button><button onClick={()=>setBottomTab('orders')} className={bottomTab==='orders'?s.tabActive:''}>주문 내역</button><button onClick={()=>setBottomTab('trades')} className={bottomTab==='trades'?s.tabActive:''}>거래 내역</button><button onClick={()=>setBottomTab('positions')} className={bottomTab==='positions'?s.tabActive:''}>포지션 ({positions.length})</button><button onClick={()=>setBottomTab('assets')} className={bottomTab==='assets'?s.tabActive:''}>자산 관리</button></div>
   {bottomTab==='open'&&<div className={s.tableWrap}><table className={s.table}><thead><tr><th>시간</th><th>종목</th><th>방향</th><th>유형</th><th>증거금</th><th>레버리지</th><th>상태</th></tr></thead><tbody>{pendingOrders.length?pendingOrders.map(o=><tr key={o.id}><td>{new Date(o.created_at).toLocaleString()}</td><td>{o.symbol}</td><td className={o.side==='LONG'?s.pos:s.neg}>{o.side}</td><td>{o.order_type}</td><td>{fmt(o.margin)}</td><td>{o.leverage}X</td><td>{o.status}</td></tr>):<tr><td colSpan={7} className={s.empty}>미체결 주문이 없습니다.</td></tr>}</tbody></table></div>}
   {bottomTab==='orders'&&<div className={s.tableWrap}><table className={s.table}><thead><tr><th>시간</th><th>종목</th><th>방향</th><th>유형</th><th>체결가</th><th>포지션 가치</th><th>수수료</th><th>상태</th></tr></thead><tbody>{orders.length?orders.map(o=><tr key={o.id}><td>{new Date(o.created_at).toLocaleString()}</td><td>{o.symbol}</td><td className={o.side==='LONG'?s.pos:s.neg}>{o.side}</td><td>{o.order_type}</td><td>{fmt(o.execution_price)}</td><td>{fmt(o.position_value)}</td><td>{fmt(o.fee,4)}</td><td>{o.status}</td></tr>):<tr><td colSpan={8} className={s.empty}>주문 내역이 없습니다.</td></tr>}</tbody></table></div>}
   {bottomTab==='trades'&&<div className={s.tableWrap}><table className={s.table}><thead><tr><th>시간</th><th>구분</th><th>가격</th><th>수량</th><th>Gross PnL</th><th>수수료</th><th>Net PnL</th></tr></thead><tbody>{executions.length?executions.map(x=><tr key={x.id}><td>{new Date(x.created_at).toLocaleString()}</td><td>{x.execution_type}</td><td>{fmt(x.price)}</td><td>{fmt(x.quantity,4)}</td><td>{fmt(x.gross_pnl)}</td><td>{fmt(x.fee,4)}</td><td className={Number(x.net_pnl)>=0?s.pos:s.neg}>{fmt(x.net_pnl)}</td></tr>):<tr><td colSpan={7} className={s.empty}>거래 내역이 없습니다.</td></tr>}</tbody></table></div>}
   {bottomTab==='positions'&&renderPositions()}
   {bottomTab==='assets'&&<div className={s.assetsGrid}>{[['Wallet Balance',summary?.wallet_balance],['Available Balance',summary?.available_balance],['Used Margin',summary?.used_margin],['Unrealized PnL',summary?.unrealized_pnl],['Equity',summary?.equity],['Margin Level',summary?.margin_level==null?'N/A':`${Number(summary.margin_level).toFixed(2)}%`]].map(([k,v])=><div key={k as string}><span>{k}</span><b>{typeof v==='number'?Number(v).toFixed(2):v??'—'}</b></div>)}</div>}
  </section>

  <section className={s.historyPanel}><div className={s.historyHead}><b>종료 포지션</b><span>{closed.length}</span></div><div className={s.tableWrap}><table className={s.table}><thead><tr><th>종목</th><th>방향</th><th>증거금</th><th>레버리지</th><th>진입가</th><th>종료가</th><th>실현손익</th><th>종료 사유</th><th>시작 시간</th></tr></thead><tbody>{closed.length?closed.map(p=><tr key={p.id}><td>{p.symbol}</td><td>{p.side}</td><td>{fmt(p.initial_margin)}</td><td>{p.leverage}X</td><td>{fmt(p.entry_price)}</td><td>{fmt(p.current_price)}</td><td className={Number(p.realized_pnl)>=0?s.pos:s.neg}>{fmt(p.realized_pnl)}</td><td>{p.close_reason||'—'}</td><td>{new Date(p.opened_at).toLocaleString()}</td></tr>):<tr><td colSpan={9} className={s.empty}>종료 포지션이 없습니다.</td></tr>}</tbody></table></div></section>
 </main>;
}
