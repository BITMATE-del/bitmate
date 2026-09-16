'use client';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import s from './CfdTrading.module.css';

type Product={id:string;symbol:string;display_name:string;category:string;current_price:number|null;bid:number|null;ask:number|null;available_leverages:number[];maintenance_margin_rate:number;trading_fee:number;status:string;trading_enabled:boolean;last_price_at:string|null};
type Position={id:string;symbol:string;side:string;status:string;leverage:number;initial_margin:number;remaining_margin:number;position_value:number;remaining_quantity:number;entry_price:number;current_price:number;liquidation_price:number|null;stop_loss:number|null;take_profit:number|null;unrealized_pnl:number;realized_pnl:number;opened_at:string;close_reason?:string|null};
type Order={id:string;symbol:string;side:string;order_type:string;margin:number;leverage:number;position_value:number;quantity:number;execution_price:number|null;fee:number;status:string;created_at:string};
type Execution={id:string;execution_type:string;price:number;quantity:number;gross_pnl:number;fee:number;net_pnl:number;created_at:string};
type BottomTab='positions'|'open'|'orders'|'trades'|'assets';
type BookTab='book'|'recent';

type Candle={open:number;high:number;low:number;close:number;x:number;width:number;yOpen:number;yHigh:number;yLow:number;yClose:number};

export default function CfdTradingClient(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]);
 const [products,setProducts]=useState<Product[]>([]),[positions,setPositions]=useState<Position[]>([]),[closed,setClosed]=useState<Position[]>([]),[orders,setOrders]=useState<Order[]>([]),[executions,setExecutions]=useState<Execution[]>([]);
 const [selected,setSelected]=useState<Product|null>(null),[side,setSide]=useState<'LONG'|'SHORT'>('LONG'),[margin,setMargin]=useState('100'),[lev,setLev]=useState(1),[sl,setSl]=useState(''),[tp,setTp]=useState(''),[summary,setSummary]=useState<any>(null),[msg,setMsg]=useState('');
 const [bottomTab,setBottomTab]=useState<BottomTab>('positions'),[bookTab,setBookTab]=useState<BookTab>('book'),[ticks,setTicks]=useState<number[]>([]);

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
 useEffect(()=>{const v=Number(selected?.current_price);if(!Number.isFinite(v)||v<=0)return;setTicks(prev=>prev[prev.length-1]===v?prev:[...prev.slice(-159),v])},[selected?.current_price]);

 const m=Number(margin)||0, ask=Number(selected?.ask||selected?.current_price||0), bid=Number(selected?.bid||selected?.current_price||0), current=Number(selected?.current_price||0);
 const px=side==='LONG'?ask:bid, posVal=m*lev, fee=selected?posVal*Number(selected.trading_fee):0;
 const liq=selected&&px&&lev?(side==='LONG'?px*(1-1/lev+Number(selected.maintenance_margin_rate)):px*(1+1/lev-Number(selected.maintenance_margin_rate))):0;
 const available=Number(summary?.available_balance)||0;
 const marginPct=available>0?Math.min(100,Math.max(0,m/available*100)):0;
 const spread=ask&&bid?Math.max(0,ask-bid):0;
 const pendingOrders=orders.filter(x=>['PENDING','SUBMITTED','PARTIALLY_FILLED','UNKNOWN'].includes(x.status));

 const candles=useMemo<Candle[]>(()=>{
  if(ticks.length<2)return[];
  const grouped:number[][]=[];
  for(let i=0;i<ticks.length;i+=4)grouped.push(ticks.slice(i,i+4));
  const raw=grouped.filter(g=>g.length).map(g=>({open:g[0],high:Math.max(...g),low:Math.min(...g),close:g[g.length-1]}));
  const values=raw.flatMap(c=>[c.high,c.low]);
  const lo=Math.min(...values),hi=Math.max(...values),span=hi-lo||1;
  const y=(v:number)=>88-((v-lo)/span)*72;
  return raw.map((c,i)=>({
   ...c,
   x:6+(i/Math.max(1,raw.length-1))*88,
   width:Math.max(1.2,Math.min(4,72/Math.max(raw.length,1))),
   yOpen:y(c.open),yHigh:y(c.high),yLow:y(c.low),yClose:y(c.close)
  }));
 },[ticks]);

 async function order(){setMsg('');if(!selected){setMsg('상품을 선택하세요.');return;}if(m<=0){setMsg('증거금을 확인하세요.');return;}const riskVersion='cfd-risk-v1';const {data:{user}}=await supabase.auth.getUser();if(!user){setMsg('로그인이 필요합니다.');return;}await supabase.from('cfd_risk_acceptances').upsert({user_id:user.id,version:riskVersion},{onConflict:'user_id,version'});const id=crypto.randomUUID();const {error}=await supabase.rpc('open_cfd_market_order',{p_symbol:selected.symbol,p_side:side,p_margin:m,p_leverage:lev,p_stop_loss:sl?Number(sl):null,p_take_profit:tp?Number(tp):null,p_client_order_id:id,p_idempotency_key:id});if(error){setMsg(error.message);return;}setMsg('CFD 시장가 주문이 체결되었습니다.');await load()}
 async function close(id:string,pct:number){if(!confirm(`${pct}% 청산하시겠습니까?`))return;const {error}=await supabase.rpc('close_cfd_position',{p_position_id:id,p_percent:pct});if(error)setMsg(error.message);else{setMsg('청산이 반영되었습니다.');await load()}}
 async function updateStops(p:Position){const nsl=prompt('Stop Loss',p.stop_loss?.toString()||'')??'';const ntp=prompt('Take Profit',p.take_profit?.toString()||'')??'';const {error}=await supabase.rpc('update_cfd_sltp',{p_position_id:p.id,p_stop_loss:nsl?Number(nsl):null,p_take_profit:ntp?Number(ntp):null});if(error)setMsg(error.message);else await load()}

 const fmt=(v:number|null|undefined,d=2)=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});
 const selectProduct=(id:string)=>{const p=products.find(x=>x.id===id)||null;setSelected(p);if(p)setLev(p.available_leverages?.[0]||1)};
 const askRows=Array.from({length:8},(_,i)=>i===7?{price:ask}:{price:null as number|null});
 const bidRows=Array.from({length:8},(_,i)=>i===0?{price:bid}:{price:null as number|null});

 const renderPositions=()=> <div className={s.tableWrap}><table className={s.table}><thead><tr><th>종목</th><th>방향</th><th>증거금</th><th>진입가</th><th>현재가</th><th>평가손익</th><th>ROI</th><th>청산가</th><th>SL / TP</th><th>관리</th></tr></thead><tbody>{positions.length?positions.map(p=>{const roi=Number(p.remaining_margin)?Number(p.unrealized_pnl)/Number(p.remaining_margin)*100:0;return <tr key={p.id}><td>{p.symbol}</td><td className={p.side==='LONG'?s.pos:s.neg}>{p.side}</td><td>{fmt(p.remaining_margin)} USDT</td><td>{fmt(p.entry_price)}</td><td>{fmt(p.current_price)}</td><td className={Number(p.unrealized_pnl)>=0?s.pos:s.neg}>{fmt(p.unrealized_pnl)} USDT</td><td>{roi.toFixed(2)}%</td><td>{fmt(p.liquidation_price)}</td><td>{p.stop_loss||'—'} / {p.take_profit||'—'}</td><td><div className={s.actions}><button className={s.ghost} onClick={()=>updateStops(p)}>SL/TP</button><button className={s.ghost} onClick={()=>close(p.id,25)}>25%</button><button className={s.ghost} onClick={()=>close(p.id,50)}>50%</button><button className={s.ghost} onClick={()=>close(p.id,100)}>전체청산</button></div></td></tr>}):<tr><td colSpan={10} className={s.empty}>보유 포지션이 없습니다.</td></tr>}</tbody></table></div>;

 return <main className={s.page}>
  {msg&&<div className={s.toast}>{msg}</div>}

  <section className={s.marketBar}>
   <div className={s.symbolBox}><select value={selected?.id||''} onChange={e=>selectProduct(e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select><span>{selected?.category||'CFD'}</span></div>
   <div className={s.priceBox}><strong>{fmt(current)}</strong><span>{selected?.symbol||'—'}</span></div>
   <div className={s.marketMetric}><span>24시간 변동률</span><b>—</b></div>
   <div className={s.marketMetric}><span>24시간 최고가</span><b>—</b></div>
   <div className={s.marketMetric}><span>24시간 최저가</span><b>—</b></div>
   <div className={s.marketMetric}><span>24시간 거래량</span><b>—</b></div>
   <div className={s.marketMetric}><span>Bid</span><b>{fmt(bid)}</b></div>
   <div className={s.marketMetric}><span>Ask</span><b>{fmt(ask)}</b></div>
   <div className={s.marketMetric}><span>Spread</span><b>{spread?spread.toFixed(4):'—'}</b></div>
  </section>

  <section className={s.terminalGrid}>
   <section className={`${s.panel} ${s.chartPanel}`}>
    <div className={s.panelTabs}><div><button className={s.tabActive}>차트</button><button>시장 정보</button></div><div className={s.chartTools}><span className={s.liveDot}/><span>LIVE</span><span>{selected?.last_price_at?new Date(selected.last_price_at).toLocaleTimeString():'연결 대기'}</span></div></div>
    <div className={s.timeframes}><button>1분</button><button>5분</button><button className={s.timeActive}>실시간</button><button>30분</button><button>1시간</button><button>4시간</button><button>1일</button><span className={s.spacer}/><button>지표</button><button>설정</button></div>
    <div className={s.chartHeader}><div><b>{selected?.display_name||'—'} · CFD</b></div><div><span>Bid <b>{fmt(bid)}</b></span><span>Ask <b>{fmt(ask)}</b></span><span>Spread <b>{spread?spread.toFixed(4):'—'}</b></span></div></div>
    <div className={s.chartStage}>
     <div className={s.chartGrid}/>
     <div className={s.drawingRail}><span>＋</span><span>╱</span><span>≡</span><span>⌁</span><span>T</span><span>⌖</span></div>
     {candles.length>0&&<svg className={s.candleChart} viewBox="0 0 100 100" preserveAspectRatio="none">{candles.map((c,i)=>{const up=c.close>=c.open;const top=Math.min(c.yOpen,c.yClose),height=Math.max(1,Math.abs(c.yClose-c.yOpen));return <g key={i}><line x1={c.x} y1={c.yHigh} x2={c.x} y2={c.yLow} stroke={up?'#56d99b':'#ff6b7a'} strokeWidth=".35" vectorEffect="non-scaling-stroke"/><rect x={c.x-c.width/2} y={top} width={c.width} height={height} fill={up?'#56d99b':'#ff6b7a'}/></g>})}</svg>}
     {candles.length<2&&<div className={s.chartLoading}><span className={s.spinner}/><span>가격 수신 중</span></div>}
     {current>0&&<div className={s.priceMarker}>{fmt(current)}</div>}
     <div className={s.volumeLane}><span>거래량</span><em>데이터 미제공</em></div>
    </div>
    <div className={s.chartFoot}><span>실시간 관측 가격 {ticks.length}개</span><span>UTC+9</span></div>
   </section>

   <section className={`${s.panel} ${s.bookPanel}`}>
    <div className={s.panelTabs}><div><button onClick={()=>setBookTab('book')} className={bookTab==='book'?s.tabActive:''}>호가</button><button onClick={()=>setBookTab('recent')} className={bookTab==='recent'?s.tabActive:''}>최근 체결</button></div></div>
    {bookTab==='book'?<div className={s.bookBody}>
     <div className={s.bookHead}><span>가격</span><span>수량</span><span>누적</span></div>
     <div className={s.bookRows}>{askRows.map((r,i)=><div key={`a${i}`} className={`${s.bookRow} ${s.askDepth}`}><b>{r.price?fmt(r.price):'—'}</b><span>—</span><span>—</span></div>)}</div>
     <div className={s.midPrice}><strong>{fmt(current)}</strong><span>{spread?`Spread ${spread.toFixed(4)}`:'현재가'}</span></div>
     <div className={s.bookRows}>{bidRows.map((r,i)=><div key={`b${i}`} className={`${s.bookRow} ${s.bidDepth}`}><b>{r.price?fmt(r.price):'—'}</b><span>—</span><span>—</span></div>)}</div>
     <div className={s.bookStatus}>실제 CFD 데이터 소스의 최우선 Bid / Ask만 표시</div>
    </div>:<div className={s.recentList}>{executions.slice(0,14).map(x=><div key={x.id}><span>{new Date(x.created_at).toLocaleTimeString()}</span><b>{fmt(x.price)}</b><span>{fmt(x.quantity,4)}</span></div>)}{!executions.length&&<div className={s.empty}>체결 내역이 없습니다.</div>}</div>}
   </section>

   <section className={`${s.panel} ${s.orderPanel}`}>
    <div className={s.sideRow}><button onClick={()=>setSide('LONG')} className={`${s.long} ${side==='LONG'?s.active:''}`}>매수</button><button onClick={()=>setSide('SHORT')} className={`${s.short} ${side==='SHORT'?s.active:''}`}>매도</button></div>
    <div className={s.orderTypes}><button disabled>지정가</button><button className={s.typeActive}>시장가</button><button disabled>스탑</button><button disabled>스탑리밋</button></div>
    <div className={s.available}><span>사용 가능</span><b>{fmt(available)} USDT</b></div>
    <label className={s.tradeField}><span>가격</span><div><input value={px?fmt(px):''} readOnly/><em>USDT</em></div></label>
    <label className={s.tradeField}><span>증거금</span><div><input value={margin} onChange={e=>setMargin(e.target.value)} inputMode="decimal"/><em>USDT</em></div></label>
    <label className={s.tradeField}><span>수량</span><div><input value={px?fmt(posVal/px,6):''} readOnly/><em>{selected?.symbol?.replace('USDT','')||'UNIT'}</em></div></label>
    <input className={s.range} type="range" min="0" max="100" step="25" value={Math.round(marginPct/25)*25} onChange={e=>{if(available>0)setMargin((available*Number(e.target.value)/100).toFixed(2))}}/>
    <div className={s.rangeLabels}><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
    <label className={s.tradeField}><span>Stop Loss</span><div><input value={sl} onChange={e=>setSl(e.target.value)} placeholder="선택"/><em>USDT</em></div></label>
    <label className={s.tradeField}><span>Take Profit</span><div><input value={tp} onChange={e=>setTp(e.target.value)} placeholder="선택"/><em>USDT</em></div></label>
    <div className={s.preview}><div><span>예상 포지션 가치</span><b>{fmt(posVal)} USDT</b></div><div><span>예상 진입가</span><b>{fmt(px)}</b></div><div><span>예상 수수료</span><b>{fmt(fee,4)} USDT</b></div><div><span>예상 청산가</span><b>{fmt(liq)}</b></div></div>
    <button className={`${s.primary} ${side==='SHORT'?s.primaryShort:''}`} onClick={order}>{side==='LONG'?'매수 주문':'매도 주문'}</button>
   </section>
  </section>

  <section className={s.accountStrip}>{[['Wallet',summary?.wallet_balance],['Available',summary?.available_balance],['Used Margin',summary?.used_margin],['Unrealized PnL',summary?.unrealized_pnl],['Equity',summary?.equity],['Margin Level',summary?.margin_level==null?'N/A':`${Number(summary.margin_level).toFixed(2)}%`]].map(([k,v])=><div key={k as string}><span>{k}</span><b>{typeof v==='number'?fmt(v):v??'—'}</b></div>)}</section>

  <section className={`${s.panel} ${s.bottomPanel}`}>
   <div className={s.bottomTabs}><button onClick={()=>setBottomTab('positions')} className={bottomTab==='positions'?s.tabActive:''}>보유 포지션 ({positions.length})</button><button onClick={()=>setBottomTab('open')} className={bottomTab==='open'?s.tabActive:''}>미체결 주문 ({pendingOrders.length})</button><button onClick={()=>setBottomTab('orders')} className={bottomTab==='orders'?s.tabActive:''}>주문 내역</button><button onClick={()=>setBottomTab('trades')} className={bottomTab==='trades'?s.tabActive:''}>거래 내역</button><button onClick={()=>setBottomTab('assets')} className={bottomTab==='assets'?s.tabActive:''}>자산 관리</button></div>
   {bottomTab==='positions'&&renderPositions()}
   {bottomTab==='open'&&<div className={s.tableWrap}><table className={s.table}><thead><tr><th>시간</th><th>종목</th><th>방향</th><th>유형</th><th>증거금</th><th>포지션 가치</th><th>상태</th></tr></thead><tbody>{pendingOrders.length?pendingOrders.map(o=><tr key={o.id}><td>{new Date(o.created_at).toLocaleString()}</td><td>{o.symbol}</td><td className={o.side==='LONG'?s.pos:s.neg}>{o.side}</td><td>{o.order_type}</td><td>{fmt(o.margin)}</td><td>{fmt(o.position_value)}</td><td>{o.status}</td></tr>):<tr><td colSpan={7} className={s.empty}>미체결 주문이 없습니다.</td></tr>}</tbody></table></div>}
   {bottomTab==='orders'&&<div className={s.tableWrap}><table className={s.table}><thead><tr><th>시간</th><th>종목</th><th>방향</th><th>주문 유형</th><th>증거금</th><th>체결가</th><th>수수료</th><th>상태</th></tr></thead><tbody>{orders.length?orders.map(o=><tr key={o.id}><td>{new Date(o.created_at).toLocaleString()}</td><td>{o.symbol}</td><td className={o.side==='LONG'?s.pos:s.neg}>{o.side}</td><td>{o.order_type}</td><td>{fmt(o.margin)}</td><td>{fmt(o.execution_price)}</td><td>{fmt(o.fee,4)}</td><td>{o.status}</td></tr>):<tr><td colSpan={8} className={s.empty}>주문 내역이 없습니다.</td></tr>}</tbody></table></div>}
   {bottomTab==='trades'&&<><div className={s.tableWrap}><table className={s.table}><thead><tr><th>시간</th><th>체결 유형</th><th>가격</th><th>수량</th><th>Gross PnL</th><th>수수료</th><th>Net PnL</th></tr></thead><tbody>{executions.length?executions.map(x=><tr key={x.id}><td>{new Date(x.created_at).toLocaleString()}</td><td>{x.execution_type}</td><td>{fmt(x.price)}</td><td>{fmt(x.quantity,6)}</td><td className={Number(x.gross_pnl)>=0?s.pos:s.neg}>{fmt(x.gross_pnl)}</td><td>{fmt(x.fee,4)}</td><td className={Number(x.net_pnl)>=0?s.pos:s.neg}>{fmt(x.net_pnl)}</td></tr>):<tr><td colSpan={7} className={s.empty}>거래 내역이 없습니다.</td></tr>}</tbody></table></div><div className={s.closedStrip}><b>종료 포지션 {closed.length}</b></div><div className={s.tableWrap}><table className={s.table}><thead><tr><th>종목</th><th>방향</th><th>증거금</th><th>진입가</th><th>종료가</th><th>실현손익</th><th>종료 사유</th><th>시작 시간</th></tr></thead><tbody>{closed.length?closed.map(p=><tr key={p.id}><td>{p.symbol}</td><td>{p.side}</td><td>{fmt(p.initial_margin)}</td><td>{fmt(p.entry_price)}</td><td>{fmt(p.current_price)}</td><td className={Number(p.realized_pnl)>=0?s.pos:s.neg}>{fmt(p.realized_pnl)}</td><td>{p.close_reason||'—'}</td><td>{new Date(p.opened_at).toLocaleString()}</td></tr>):<tr><td colSpan={8} className={s.empty}>종료 포지션이 없습니다.</td></tr>}</tbody></table></div></>}
   {bottomTab==='assets'&&<div className={s.assetsGrid}>{[['Wallet Balance',summary?.wallet_balance],['Available',summary?.available_balance],['Used Margin',summary?.used_margin],['Unrealized PnL',summary?.unrealized_pnl],['Equity',summary?.equity],['Margin Level',summary?.margin_level==null?'N/A':`${Number(summary.margin_level).toFixed(2)}%`]].map(([k,v])=><div key={k as string}><span>{k}</span><b>{typeof v==='number'?fmt(v):v??'—'}</b></div>)}</div>}
  </section>

  <div className={s.tickerBar}><span className={s.connection}>● 연결 정상</span>{products.filter(p=>p.current_price).slice(0,6).map(p=><span key={p.id}><b>{p.display_name}</b> {fmt(p.current_price)}</span>)}</div>
 </main>;
}
