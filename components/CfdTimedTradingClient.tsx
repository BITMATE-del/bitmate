'use client';

import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import BinanceMarketDepth from './BinanceMarketDepth';
import CfdMarketSelector,{type LiveMarket} from './CfdMarketSelector';
import s from './CfdTimedTrading.module.css';

type Product={id:string;symbol:string;display_name:string;category:string;current_price:number|null;bid:number|null;ask:number|null;min_order:number;max_order:number;last_price_at:string|null};
type TimedTrade={id:string;symbol:string;direction:'UP'|'DOWN';duration_minutes:number;amount:number;start_price:number;end_price:number|null;status:'ACTIVE'|'SETTLED'|'CANCELLED';result:'WIN'|'LOSS'|'DRAW'|null;payout_amount:number|null;net_profit:number|null;starts_at:string;expires_at:string;settled_at:string|null;created_at:string};
type Ledger={id:string;transaction_type:string;amount:number;available_before:number;available_after:number;trade_hold_before:number;trade_hold_after:number;description:string|null;created_at:string};
type Summary={wallet_balance:number;available_balance:number;trade_hold_balance:number;realized_pnl:number;active_trades:number;asset:string};
type BookTab='book'|'recent';
type BottomTab='active'|'history'|'ledger';

const fmt=(v:number|null|undefined,d=2)=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtPrice=(v:number|null|undefined)=>{const n=Number(v);if(!Number.isFinite(n)||n<=0)return '—';const d=n>=1000?2:n>=1?4:6;return n.toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d})};
const compact=(v:number|null|undefined)=>{const n=Number(v);return !Number.isFinite(n)?'—':new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(n)};

export default function CfdTimedTradingClient(){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [products,setProducts]=useState<Product[]>([]);
  const [selected,setSelected]=useState<Product|null>(null);
  const [markets,setMarkets]=useState<LiveMarket[]>([]);
  const [liveMarket,setLiveMarket]=useState<LiveMarket|null>(null);
  const [trades,setTrades]=useState<TimedTrade[]>([]);
  const [ledger,setLedger]=useState<Ledger[]>([]);
  const [summary,setSummary]=useState<Summary|null>(null);
  const [direction,setDirection]=useState<'UP'|'DOWN'>('UP');
  const [duration,setDuration]=useState<3|5>(3);
  const [amount,setAmount]=useState('100');
  const [bookTab,setBookTab]=useState<BookTab>('book');
  const [bottomTab,setBottomTab]=useState<BottomTab>('active');
  const [msg,setMsg]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [now,setNow]=useState(Date.now());

  async function loadProducts(){
    const {data:p}=await supabase.from('cfd_products').select('id,symbol,display_name,category,current_price,bid,ask,min_order,max_order,last_price_at').eq('status','ACTIVE').eq('trading_enabled',true).order('sort_order');
    const list=(p||[]) as Product[];
    setProducts(list);
    setSelected(prev=>prev?(list.find(x=>x.id===prev.id)||list[0]||null):(list[0]||null));
  }

  async function loadAccount(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setTrades([]);setLedger([]);setSummary(null);return;}
    await supabase.rpc('ensure_cfd_demo_account');
    const [{data:t},{data:l},{data:sum}]=await Promise.all([
      supabase.from('cfd_timed_trades').select('*').order('created_at',{ascending:false}).limit(100),
      supabase.from('cfd_timed_ledger').select('*').order('created_at',{ascending:false}).limit(100),
      supabase.rpc('get_cfd_timed_account_summary')
    ]);
    setTrades((t||[]) as TimedTrade[]);
    setLedger((l||[]) as Ledger[]);
    setSummary((sum||null) as Summary|null);
  }

  useEffect(()=>{loadProducts();loadAccount();const accountId=setInterval(loadAccount,2000);const productId=setInterval(loadProducts,60000);return()=>{clearInterval(accountId);clearInterval(productId)}},[]);
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(id)},[]);

  useEffect(()=>{
    if(!selected?.symbol)return;
    const initial=markets.find(m=>m.symbol===selected.symbol)||null;
    if(initial)setLiveMarket(initial);
    const ws=new WebSocket(`wss://stream.binance.com:9443/ws/${selected.symbol.toLowerCase()}@ticker`);
    ws.onmessage=(ev)=>{
      try{
        const x=JSON.parse(ev.data);
        setLiveMarket({
          symbol:String(x.s),base:String(x.s).replace(/USDT$/,''),displayName:`${String(x.s).replace(/USDT$/,'')}/USDT`,
          lastPrice:Number(x.c),priceChange:Number(x.p),changePct:Number(x.P),high24h:Number(x.h),low24h:Number(x.l),volume:Number(x.v),quoteVolume:Number(x.q),bid:Number(x.b),ask:Number(x.a)
        });
      }catch{}
    };
    return()=>ws.close();
  },[selected?.symbol,markets]);

  const current=Number(liveMarket?.lastPrice||selected?.current_price||0);
  const bid=Number(liveMarket?.bid||selected?.bid||selected?.current_price||0);
  const ask=Number(liveMarket?.ask||selected?.ask||selected?.current_price||0);
  const spread=ask&&bid?Math.max(0,ask-bid):0;
  const activeTrade=trades.find(t=>t.status==='ACTIVE')||null;
  const settled=trades.filter(t=>t.status==='SETTLED');
  const amountNum=Number(amount)||0;
  const expectedPayout=amountNum>0?Math.floor(amountNum*1.95):0;
  const remainingMs=activeTrade?Math.max(0,new Date(activeTrade.expires_at).getTime()-now):0;
  const remainingSec=Math.ceil(remainingMs/1000);
  const mm=String(Math.floor(remainingSec/60)).padStart(2,'0');
  const ss=String(remainingSec%60).padStart(2,'0');

  async function startTrade(){
    setMsg('');
    if(!selected){setMsg('상품을 선택하세요.');return;}
    if(activeTrade){setMsg('진행 중인 거래가 있습니다.');return;}
    if(amountNum<=0){setMsg('주문금액을 입력하세요.');return;}
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setMsg('로그인이 필요합니다.');return;}
    setSubmitting(true);
    try{
      const key=crypto.randomUUID();
      const {error}=await supabase.rpc('start_cfd_timed_trade',{p_symbol:selected.symbol,p_direction:direction,p_duration_minutes:duration,p_amount:amountNum,p_idempotency_key:key});
      if(error)throw error;
      setMsg(`${direction} ${duration}분 거래가 시작되었습니다.`);
      await loadAccount();
    }catch(e:any){
      const m=String(e?.message||'주문 처리 중 오류가 발생했습니다.');
      const map:Record<string,string>={ACTIVE_TRADE_EXISTS:'진행 중인 거래가 있습니다.',INSUFFICIENT_BALANCE:'사용 가능한 잔액이 부족합니다.',INVALID_AMOUNT:'주문금액을 확인하세요.',PRODUCT_NOT_AVAILABLE:'현재 거래할 수 없는 상품입니다.',PRICE_PROVIDER_ERROR:'가격 제공처 연결이 지연되고 있습니다.',PRICE_UNAVAILABLE:'현재 체결가격을 가져올 수 없습니다.'};
      setMsg(map[m]||m);
    }finally{setSubmitting(false)}
  }

  const resultClass=(r:TimedTrade['result'])=>r==='WIN'?s.win:r==='LOSS'?s.loss:s.draw;
  const hotMarkets=markets.slice(0,6);

  return <main className={s.page}>
    {msg&&<div className={s.toast}>{msg}</div>}

    <section className={s.marketBar}>
      <div className={s.symbolBox}><CfdMarketSelector products={products} selected={selected} onSelect={setSelected} onMarkets={setMarkets}/></div>
      <div className={s.priceBox}><strong>{fmtPrice(current)}</strong><span>{liveMarket?.changePct!=null?<span style={{color:liveMarket.changePct>=0?'#56d99b':'#ff6b7a'}}>{liveMarket.changePct>=0?'+':''}{liveMarket.changePct.toFixed(2)}%</span>:'현재가'}</span></div>
      <div className={s.metric}><span>24H Change</span><b style={{color:(liveMarket?.changePct||0)>=0?'#56d99b':'#ff6b7a'}}>{liveMarket?`${liveMarket.priceChange>=0?'+':''}${fmtPrice(liveMarket.priceChange)} · ${liveMarket.changePct>=0?'+':''}${liveMarket.changePct.toFixed(2)}%`:'—'}</b></div>
      <div className={s.metric}><span>24H High</span><b>{fmtPrice(liveMarket?.high24h)}</b></div>
      <div className={s.metric}><span>24H Low</span><b>{fmtPrice(liveMarket?.low24h)}</b></div>
      <div className={s.metric}><span>24H Vol({liveMarket?.base||'Asset'})</span><b>{compact(liveMarket?.volume)}</b></div>
      <div className={s.metric}><span>24H Vol(USDT)</span><b>{compact(liveMarket?.quoteVolume)}</b></div>
    </section>

    <section className={s.terminalGrid}>
      <section className={`${s.panel} ${s.chartPanel}`}>
        <div className={s.panelTabs}><div><button className={s.activeTab}>차트</button></div><div className={s.chartTools}><span className={s.liveDot}/><span>LIVE</span><span>{fmtPrice(bid)} / {fmtPrice(ask)}</span></div></div>
        <div className={s.chartStage} data-symbol={selected?.symbol||'BTCUSDT'}/>
      </section>

      <section className={s.panel}>
        <div className={s.panelTabs}><div><button onClick={()=>setBookTab('book')} className={bookTab==='book'?s.activeTab:''}>호가</button><button onClick={()=>setBookTab('recent')} className={bookTab==='recent'?s.activeTab:''}>최근 체결</button></div></div>
        {selected?<BinanceMarketDepth symbol={selected.symbol} currentPrice={current} mode={bookTab} classNames={{bookBody:s.bookBody,bookHead:s.bookHead,bookRows:s.bookRows,bookRow:s.bookRow,askDepth:s.askDepth,bidDepth:s.bidDepth,midPrice:s.midPrice,bookStatus:s.bookStatus,recentList:s.recentList,empty:s.empty}}/>:<div className={s.empty}>상품을 선택하세요.</div>}
      </section>

      <section className={`${s.panel} ${s.orderPanel}`}>
        <div className={s.directionRow}><button className={direction==='UP'?s.upActive:''} onClick={()=>setDirection('UP')}>▲ UP</button><button className={direction==='DOWN'?s.downActive:''} onClick={()=>setDirection('DOWN')}>▼ DOWN</button></div>
        <span className={s.label}>거래시간</span>
        <div className={s.durationRow}><button className={duration===3?s.durationActive:''} onClick={()=>setDuration(3)}>3분</button><button className={duration===5?s.durationActive:''} onClick={()=>setDuration(5)}>5분</button></div>
        <div className={s.balance}><span>사용 가능</span><b>{fmt(summary?.available_balance)} {summary?.asset||'USDT'}</b></div>
        <span className={s.label}>주문금액</span>
        <div className={s.field}><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/><em>{summary?.asset||'USDT'}</em></div>
        <div className={s.quickAmounts}>{[100,300,500,1000].map(v=><button key={v} onClick={()=>setAmount(String(v))}>{v.toLocaleString()}</button>)}</div>
        <div className={s.summary}><div><span>서버 시작가</span><b>주문 시 확정</b></div><div><span>예상 WIN 지급</span><b>{fmt(expectedPayout,0)}</b></div><div><span>DRAW 지급</span><b>{fmt(amountNum,0)}</b></div><div><span>LOSS 지급</span><b>0</b></div></div>
        <button className={`${s.submit} ${direction==='DOWN'?s.submitDown:''}`} disabled={submitting||!!activeTrade} onClick={startTrade}>{activeTrade?'거래 진행 중':submitting?'처리 중...':`${direction} ${duration}분 거래 시작`}</button>
        <div className={s.notice}>시작가·종료가·WIN/LOSS/DRAW·지급금액은 서버에서만 확정됩니다. 화면을 닫아도 만료 후 자동 정산됩니다.</div>
        {activeTrade&&<div className={s.activeTrade}><div className={s.activeTradeTop}><strong>{activeTrade.symbol} · {activeTrade.direction}</strong><span className={s.countdown}>{mm}:{ss}</span></div><div className={s.tradeMeta}><div><span>시작가</span><b>{fmt(activeTrade.start_price,8)}</b></div><div><span>주문금액</span><b>{fmt(activeTrade.amount)}</b></div><div><span>거래시간</span><b>{activeTrade.duration_minutes}분</b></div><div><span>만료</span><b>{new Date(activeTrade.expires_at).toLocaleTimeString('ko-KR',{hour12:false})}</b></div></div></div>}
      </section>
    </section>

    <section className={s.accountStrip}><div><span>Wallet</span><b>{fmt(summary?.wallet_balance)}</b></div><div><span>Available</span><b>{fmt(summary?.available_balance)}</b></div><div><span>Trade Hold</span><b>{fmt(summary?.trade_hold_balance)}</b></div><div><span>누적 실현손익</span><b className={(summary?.realized_pnl||0)>=0?s.win:s.loss}>{fmt(summary?.realized_pnl)}</b></div></section>

    <section className={`${s.panel} ${s.bottomPanel}`}>
      <div className={s.bottomTabs}><button className={bottomTab==='active'?s.activeTab:''} onClick={()=>setBottomTab('active')}>진행 중 거래</button><button className={bottomTab==='history'?s.activeTab:''} onClick={()=>setBottomTab('history')}>거래 내역</button><button className={bottomTab==='ledger'?s.activeTab:''} onClick={()=>setBottomTab('ledger')}>정산 원장</button></div>
      {bottomTab==='active'&&<div className={s.tableWrap}><table className={s.table}><thead><tr><th>종목</th><th>방향</th><th>시간</th><th>주문금액</th><th>시작가</th><th>만료시간</th><th>상태</th></tr></thead><tbody>{activeTrade?<tr><td>{activeTrade.symbol}</td><td>{activeTrade.direction}</td><td>{activeTrade.duration_minutes}분</td><td>{fmt(activeTrade.amount)}</td><td>{fmt(activeTrade.start_price,8)}</td><td>{new Date(activeTrade.expires_at).toLocaleString()}</td><td>{activeTrade.status}</td></tr>:<tr><td colSpan={7} className={s.empty}>진행 중인 거래가 없습니다.</td></tr>}</tbody></table></div>}
      {bottomTab==='history'&&<div className={s.tableWrap}><table className={s.table}><thead><tr><th>시작시간</th><th>종목</th><th>방향</th><th>기간</th><th>금액</th><th>시작가</th><th>종료가</th><th>결과</th><th>지급금액</th><th>순손익</th></tr></thead><tbody>{settled.length?settled.map(t=><tr key={t.id}><td>{new Date(t.starts_at).toLocaleString()}</td><td>{t.symbol}</td><td>{t.direction}</td><td>{t.duration_minutes}분</td><td>{fmt(t.amount)}</td><td>{fmt(t.start_price,8)}</td><td>{fmt(t.end_price,8)}</td><td className={resultClass(t.result)}>{t.result}</td><td>{fmt(t.payout_amount)}</td><td className={(t.net_profit||0)>=0?s.win:s.loss}>{fmt(t.net_profit)}</td></tr>):<tr><td colSpan={10} className={s.empty}>정산된 거래가 없습니다.</td></tr>}</tbody></table></div>}
      {bottomTab==='ledger'&&<div className={s.tableWrap}><table className={s.table}><thead><tr><th>시간</th><th>유형</th><th>금액</th><th>Available 전</th><th>Available 후</th><th>Hold 전</th><th>Hold 후</th><th>설명</th></tr></thead><tbody>{ledger.length?ledger.map(l=><tr key={l.id}><td>{new Date(l.created_at).toLocaleString()}</td><td>{l.transaction_type}</td><td>{fmt(l.amount)}</td><td>{fmt(l.available_before)}</td><td>{fmt(l.available_after)}</td><td>{fmt(l.trade_hold_before)}</td><td>{fmt(l.trade_hold_after)}</td><td>{l.description||'—'}</td></tr>):<tr><td colSpan={8} className={s.empty}>원장 내역이 없습니다.</td></tr>}</tbody></table></div>}
    </section>

    <div className={s.ticker}><span>● 서버 자동 정산 활성</span>{hotMarkets.map(m=><span key={m.symbol}><b>{m.displayName}</b> {fmtPrice(m.lastPrice)} <i style={{fontStyle:'normal',color:m.changePct>=0?'#56d99b':'#ff6b7a'}}>{m.changePct>=0?'+':''}{m.changePct.toFixed(2)}%</i></span>)}</div>
  </main>;
}
