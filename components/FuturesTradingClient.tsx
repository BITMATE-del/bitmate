'use client';

import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import BinanceMarketDepth from './BinanceMarketDepth';
import s from './FuturesTrading.module.css';

type Market={
  symbol:string;display_name:string;base_asset:string;quote_asset:string;enabled:boolean;trading_status:string;
  last_price:number;mark_price:number;index_price:number;bid:number;ask:number;change_pct:number;high_24h:number;low_24h:number;
  volume:number;quote_volume:number;funding_rate:number;next_funding_time:string;max_leverage:number;maker_fee:number;taker_fee:number;
  maintenance_margin_rate:number;quantity_precision:number;price_precision:number;min_order_size:number;max_order_size:number;min_notional:number;max_notional:number;stale:boolean;
};

type MarketsPayload={
  settings:{enabled:boolean;max_price_age_seconds:number}|null;
  health:{prices_at:string|null;risk_at:string|null;funding_at:string|null;last_error:string|null}|null;
  markets:Market[];
};

type Account={
  balance:number;realized_pnl:number;trading_fees:number;funding:number;position_mode:string;status:string;
  available_balance?:number;wallet_balance?:number;used_margin?:number;unrealized_pnl?:number;withdrawable_balance?:number;
};

type Position={
  id:string;symbol:string;position_side:string;side:'LONG'|'SHORT';size:number;leverage:number;margin_mode:string;margin:number;entry_price:number;mark_price:number;
  liquidation_price:number|null;unrealized_pnl:number;realized_pnl:number;roe:number;take_profit:number|null;stop_loss:number|null;accumulated_funding:number;opening_fee:number;closing_fee:number;status:string;created_at:string;
};

type Order={
  id:string;client_order_id:string;symbol:string;side:string;position_side:string;order_type:string;margin_mode:string;leverage:number;price:number|null;trigger_price:number|null;
  quantity:number;filled_quantity:number;remaining_quantity:number;average_fill_price:number|null;reduce_only:boolean;post_only:boolean;time_in_force:string;take_profit:number|null;stop_loss:number|null;
  status:string;fee:number;rejection_reason:string|null;created_at:string;completed_at:string|null;
};

type Fill={id:string;order_id:string;position_id:string;price:number;quantity:number;realized_pnl:number;fee:number;liquidity_role:string;created_at:string};
type Funding={id:string;position_id:string;symbol:string;funding_time:string;rate:number;notional:number;amount:number;created_at:string};
type Snapshot={account:Account|null;positions:Position[];orders:Order[];fills:Fill[];ledger:any[];history:Position[];funding:Funding[]};
type Preview={order_value:number;required_margin:number;estimated_fee:number;estimated_liquidation_price:number;available_balance:number;leverage:number;note:string};
type BottomTab='positions'|'open'|'orders'|'fills'|'funding';
type BookTab='book'|'recent';
type OrderType='MARKET'|'LIMIT'|'TRIGGER';
type MarginMode='CROSS'|'ISOLATED';

const num=(v:any)=>Number(v||0);
const priceFmt=(v:any,p=2)=>{const n=Number(v);if(!Number.isFinite(n))return '—';return n.toLocaleString(undefined,{minimumFractionDigits:p,maximumFractionDigits:p})};
const compact=(v:any)=>{const n=Number(v);return Number.isFinite(n)?new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(n):'—'};
const pct=(v:any,d=2)=>`${num(v)>=0?'+':''}${(num(v)*100).toFixed(d)}%`;
const dateTime=(v:string|null|undefined)=>v?new Date(v).toLocaleString('ko-KR',{hour12:false}):'—';

export default function FuturesTradingClient(){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [marketsPayload,setMarketsPayload]=useState<MarketsPayload>({settings:null,health:null,markets:[]});
  const [symbol,setSymbol]=useState('BTCUSDT');
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [loggedIn,setLoggedIn]=useState(false);
  const [orderType,setOrderType]=useState<OrderType>('MARKET');
  const [marginMode,setMarginMode]=useState<MarginMode>('ISOLATED');
  const [leverage,setLeverage]=useState(10);
  const [quantity,setQuantity]=useState('0.001');
  const [price,setPrice]=useState('');
  const [triggerPrice,setTriggerPrice]=useState('');
  const [triggerDirection,setTriggerDirection]=useState<'ABOVE'|'BELOW'>('ABOVE');
  const [takeProfit,setTakeProfit]=useState('');
  const [stopLoss,setStopLoss]=useState('');
  const [reduceOnly,setReduceOnly]=useState(false);
  const [postOnly,setPostOnly]=useState(false);
  const [preview,setPreview]=useState<Preview|null>(null);
  const [bottomTab,setBottomTab]=useState<BottomTab>('positions');
  const [bookTab,setBookTab]=useState<BookTab>('book');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [now,setNow]=useState(Date.now());

  const market=marketsPayload.markets.find(x=>x.symbol===symbol)||marketsPayload.markets[0]||null;
  const priceDigits=market?.price_precision??2;
  const qtyDigits=market?.quantity_precision??3;
  const activeOrders=(snapshot?.orders||[]).filter(o=>['OPEN','PARTIALLY_FILLED','TRIGGER_WAITING','TRIGGERED'].includes(o.status));
  const positions=snapshot?.positions||[];
  const settingsEnabled=!!marketsPayload.settings?.enabled;
  const canTrade=loggedIn&&settingsEnabled&&!!market&&!market.stale&&market.enabled&&market.trading_status==='ACTIVE';

  async function loadMarkets(){
    const {data,error}=await supabase.rpc('futures_markets');
    if(error)return;
    const p=(data||{}) as MarketsPayload;
    const rows=Array.isArray(p.markets)?p.markets:[];
    setMarketsPayload({...p,markets:rows});
    if(rows.length&&!rows.some(x=>x.symbol===symbol))setSymbol(rows[0].symbol);
  }

  async function loadSnapshot(){
    const {data:{user}}=await supabase.auth.getUser();
    setLoggedIn(!!user);
    if(!user){setSnapshot(null);return;}
    const {data,error}=await supabase.rpc('futures_action',{p_action:'snapshot',p_payload:{}});
    if(!error&&data)setSnapshot(data as Snapshot);
  }

  useEffect(()=>{
    let alive=true;
    const init=async()=>{if(!alive)return;await Promise.all([loadMarkets(),loadSnapshot()])};
    init();
    const m=setInterval(()=>{if(alive)loadMarkets()},1500);
    const a=setInterval(()=>{if(alive)loadSnapshot()},2500);
    const n=setInterval(()=>setNow(Date.now()),1000);
    const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>loadSnapshot());
    return()=>{alive=false;clearInterval(m);clearInterval(a);clearInterval(n);subscription.unsubscribe()};
  },[supabase,symbol]);

  useEffect(()=>{
    if(!market)return;
    if(orderType==='LIMIT'&&!price)setPrice(String(Number(market.last_price).toFixed(priceDigits)));
    if(orderType==='TRIGGER'&&!triggerPrice)setTriggerPrice(String(Number(market.last_price).toFixed(priceDigits)));
  },[symbol,orderType,market?.last_price]);

  useEffect(()=>{
    let dead=false;
    const q=Number(quantity);
    if(!loggedIn||!market||!Number.isFinite(q)||q<=0){setPreview(null);return;}
    const id=setTimeout(async()=>{
      const payload:any={symbol:market.symbol,side:'BUY',orderType,marginMode,leverage,quantity:q};
      if(orderType==='LIMIT')payload.price=Number(price);
      if(orderType==='TRIGGER'&&price)payload.price=Number(price);
      const {data,error}=await supabase.rpc('futures_action',{p_action:'preview',p_payload:payload});
      if(!dead&&!error)setPreview(data as Preview);
      if(!dead&&error)setPreview(null);
    },250);
    return()=>{dead=true;clearTimeout(id)};
  },[loggedIn,market?.symbol,quantity,leverage,marginMode,orderType,price,supabase]);

  const fundingMs=market?.next_funding_time?Math.max(0,new Date(market.next_funding_time).getTime()-now):0;
  const fundingText=`${String(Math.floor(fundingMs/3600000)).padStart(2,'0')}:${String(Math.floor((fundingMs%3600000)/60000)).padStart(2,'0')}:${String(Math.floor((fundingMs%60000)/1000)).padStart(2,'0')}`;

  const setRatio=(ratio:number)=>{
    if(!market||!snapshot?.account)return;
    const available=num(snapshot.account.available_balance);
    const ref=orderType==='LIMIT'?num(price):num(market.ask);
    if(ref<=0)return;
    const q=(available*ratio*leverage/ref);
    const f=Math.floor(q*Math.pow(10,qtyDigits))/Math.pow(10,qtyDigits);
    setQuantity(String(Math.max(0,f)));
  };

  async function submit(side:'BUY'|'SELL'){
    setMessage('');
    if(!loggedIn){setMessage('로그인 후 선물거래를 이용할 수 있습니다.');return;}
    if(!settingsEnabled){setMessage('현재 선물 신규 거래가 관리자 설정에서 비활성화되어 있습니다.');return;}
    if(!market||market.stale){setMessage('실시간 선물 시세를 확인 중입니다.');return;}
    const q=Number(quantity);
    if(!Number.isFinite(q)||q<=0){setMessage('주문 수량을 확인하세요.');return;}
    const payload:any={
      symbol:market.symbol,side,positionSide:'BOTH',orderType,marginMode,leverage,quantity:q,
      clientOrderId:`web-${crypto.randomUUID()}`,reduceOnly,postOnly,timeInForce:postOnly?'POST_ONLY':'GTC',triggerBy:'MARK'
    };
    if(orderType==='LIMIT')payload.price=Number(price);
    if(orderType==='TRIGGER'){
      payload.triggerPrice=Number(triggerPrice);payload.triggerDirection=triggerDirection;payload.triggerOrderType=price?'LIMIT':'MARKET';
      if(price)payload.price=Number(price);
    }
    if(takeProfit)payload.takeProfit=Number(takeProfit);
    if(stopLoss)payload.stopLoss=Number(stopLoss);
    setBusy(true);
    try{
      const {data,error}=await supabase.rpc('futures_action',{p_action:'order',p_payload:payload});
      if(error)throw error;
      const order=data as Order;
      setMessage(order.status==='FILLED'?'주문이 체결되었습니다.':order.status==='REJECTED'?(order.rejection_reason||'주문이 거부되었습니다.'):'주문이 접수되었습니다.');
      await loadSnapshot();
    }catch(e:any){setMessage(String(e?.message||'주문 처리 중 오류가 발생했습니다.'))}
    finally{setBusy(false)}
  }

  async function cancelOrder(orderId:string){
    setBusy(true);setMessage('');
    const {error}=await supabase.rpc('futures_action',{p_action:'cancel',p_payload:{orderId}});
    setBusy(false);
    if(error)setMessage(error.message);else{setMessage('주문을 취소했습니다.');loadSnapshot()}
  }

  async function cancelAll(){
    setBusy(true);setMessage('');
    const {error}=await supabase.rpc('futures_action',{p_action:'cancel_all',p_payload:{}});
    setBusy(false);
    if(error)setMessage(error.message);else{setMessage('미체결 주문을 모두 취소했습니다.');loadSnapshot()}
  }

  return <main className={s.page}>
    {message&&<div className={s.toast} onClick={()=>setMessage('')}>{message}</div>}

    <section className={s.marketHeader}>
      <div className={s.symbolCell}>
        <select value={market?.symbol||symbol} onChange={e=>setSymbol(e.target.value)} aria-label="선물 종목 선택">
          {marketsPayload.markets.map(m=><option key={m.symbol} value={m.symbol}>{m.display_name||m.symbol} Perpetual</option>)}
        </select>
        <small>USDT-M · Perpetual</small>
      </div>
      <div className={s.priceCell}><strong className={num(market?.change_pct)>=0?s.up:s.down}>{priceFmt(market?.last_price,priceDigits)}</strong><span>{num(market?.change_pct)>=0?'+':''}{num(market?.change_pct).toFixed(2)}%</span></div>
      <div className={s.metric}><span>Mark Price</span><b>{priceFmt(market?.mark_price,priceDigits)}</b></div>
      <div className={s.metric}><span>Index Price</span><b>{priceFmt(market?.index_price,priceDigits)}</b></div>
      <div className={s.metric}><span>24H High</span><b>{priceFmt(market?.high_24h,priceDigits)}</b></div>
      <div className={s.metric}><span>24H Low</span><b>{priceFmt(market?.low_24h,priceDigits)}</b></div>
      <div className={s.metric}><span>24H Volume</span><b>{compact(market?.quote_volume)} USDT</b></div>
      <div className={s.metric}><span>Funding / Next</span><b className={num(market?.funding_rate)>=0?s.up:s.down}>{pct(market?.funding_rate,4)} · {fundingText}</b></div>
    </section>

    {!settingsEnabled&&<div className={s.systemBanner}>선물거래 엔진은 연결되어 있으나 현재 신규 진입은 비활성화 상태입니다. 시세·포지션·내역 조회는 정상 동작합니다.</div>}

    <section className={s.terminal}>
      <section className={`${s.panel} ${s.chartPanel}`}>
        <div className={s.panelHead}><div><button className={s.activeTab}>차트</button><button>정보</button></div><span className={s.live}><i/> LIVE · Binance USDT-M</span></div>
        <div className={s.chartStage} data-symbol={market?.symbol||'BTCUSDT'}/>
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}><div><button className={bookTab==='book'?s.activeTab:''} onClick={()=>setBookTab('book')}>호가</button><button className={bookTab==='recent'?s.activeTab:''} onClick={()=>setBookTab('recent')}>최근 체결</button></div></div>
        {market?<BinanceMarketDepth symbol={market.symbol} currentPrice={num(market.last_price)} mode={bookTab} classNames={{bookBody:s.bookBody,bookHead:s.bookHead,bookRows:s.bookRows,bookRow:s.bookRow,askDepth:s.askDepth,bidDepth:s.bidDepth,midPrice:s.midPrice,bookStatus:s.bookStatus,recentList:s.recentList,empty:s.empty}}/>:<div className={s.empty}>시장을 불러오는 중입니다.</div>}
      </section>

      <section className={`${s.panel} ${s.orderPanel}`}>
        <div className={s.orderTop}><button className={marginMode==='CROSS'?s.selectedPill:''} onClick={()=>setMarginMode('CROSS')}>Cross</button><button className={marginMode==='ISOLATED'?s.selectedPill:''} onClick={()=>setMarginMode('ISOLATED')}>Isolated</button><label><input type="number" min={1} max={market?.max_leverage||100} value={leverage} onChange={e=>setLeverage(Math.max(1,Math.min(market?.max_leverage||100,Number(e.target.value)||1)))}/><span>x</span></label></div>
        <div className={s.orderTabs}><button className={orderType==='MARKET'?s.activeTab:''} onClick={()=>setOrderType('MARKET')}>Market</button><button className={orderType==='LIMIT'?s.activeTab:''} onClick={()=>setOrderType('LIMIT')}>Limit</button><button className={orderType==='TRIGGER'?s.activeTab:''} onClick={()=>setOrderType('TRIGGER')}>Trigger</button></div>
        <div className={s.available}><span>Available</span><b>{loggedIn?`${priceFmt(snapshot?.account?.available_balance,2)} USDT`:'로그인 필요'}</b></div>

        {orderType!=='MARKET'&&<label className={s.inputRow}><span>{orderType==='LIMIT'?'Price':'Order Price (선택)'}</span><input value={price} onChange={e=>setPrice(e.target.value)} inputMode="decimal" placeholder={orderType==='TRIGGER'?'시장가 체결 시 비워두세요':''}/><em>USDT</em></label>}
        {orderType==='TRIGGER'&&<><label className={s.inputRow}><span>Trigger Price</span><input value={triggerPrice} onChange={e=>setTriggerPrice(e.target.value)} inputMode="decimal"/><em>USDT</em></label><div className={s.triggerDir}><button className={triggerDirection==='ABOVE'?s.selectedPill:''} onClick={()=>setTriggerDirection('ABOVE')}>이상 도달</button><button className={triggerDirection==='BELOW'?s.selectedPill:''} onClick={()=>setTriggerDirection('BELOW')}>이하 도달</button></div></>}
        <label className={s.inputRow}><span>Quantity</span><input value={quantity} onChange={e=>setQuantity(e.target.value)} inputMode="decimal"/><em>{market?.base_asset||'BTC'}</em></label>
        <div className={s.ratios}>{[.25,.5,.75,1].map(r=><button key={r} onClick={()=>setRatio(r)}>{Math.round(r*100)}%</button>)}</div>

        <div className={s.tpsl}><label><span>Take Profit</span><input value={takeProfit} onChange={e=>setTakeProfit(e.target.value)} inputMode="decimal" placeholder="선택"/></label><label><span>Stop Loss</span><input value={stopLoss} onChange={e=>setStopLoss(e.target.value)} inputMode="decimal" placeholder="선택"/></label></div>
        <div className={s.options}><label><input type="checkbox" checked={reduceOnly} onChange={e=>setReduceOnly(e.target.checked)}/> Reduce Only</label><label><input type="checkbox" checked={postOnly} disabled={orderType!=='LIMIT'} onChange={e=>setPostOnly(e.target.checked)}/> Post Only</label></div>

        <div className={s.preview}>
          <div><span>Order Value</span><b>{priceFmt(preview?.order_value,2)}</b></div><div><span>Required Margin</span><b>{priceFmt(preview?.required_margin,2)}</b></div>
          <div><span>Estimated Fee</span><b>{priceFmt(preview?.estimated_fee,4)}</b></div><div><span>Est. Liq. Price</span><b>{priceFmt(preview?.estimated_liquidation_price,priceDigits)}</b></div>
        </div>
        <div className={s.tradeButtons}><button disabled={busy||!canTrade} className={s.longBtn} onClick={()=>submit('BUY')}>매수 / 롱</button><button disabled={busy||!canTrade} className={s.shortBtn} onClick={()=>submit('SELL')}>매도 / 숏</button></div>
        <p className={s.orderNote}>수수료·증거금·PNL·청산가격·체결은 서버 Futures Engine이 최종 확정합니다.</p>
      </section>
    </section>

    <section className={s.accountStrip}>
      <div><span>Wallet Balance</span><b>{loggedIn?priceFmt(snapshot?.account?.balance,2):'—'}</b></div>
      <div><span>Available</span><b>{loggedIn?priceFmt(snapshot?.account?.available_balance,2):'—'}</b></div>
      <div><span>Used Margin</span><b>{loggedIn?priceFmt(snapshot?.account?.used_margin,2):'—'}</b></div>
      <div><span>Unrealized PNL</span><b className={num(snapshot?.account?.unrealized_pnl)>=0?s.up:s.down}>{loggedIn?priceFmt(snapshot?.account?.unrealized_pnl,2):'—'}</b></div>
      <div><span>Realized PNL</span><b className={num(snapshot?.account?.realized_pnl)>=0?s.up:s.down}>{loggedIn?priceFmt(snapshot?.account?.realized_pnl,2):'—'}</b></div>
    </section>

    <section className={`${s.panel} ${s.bottomPanel}`}>
      <div className={s.bottomTabs}>
        <button className={bottomTab==='positions'?s.activeTab:''} onClick={()=>setBottomTab('positions')}>포지션 ({positions.length})</button>
        <button className={bottomTab==='open'?s.activeTab:''} onClick={()=>setBottomTab('open')}>미체결 주문 ({activeOrders.length})</button>
        <button className={bottomTab==='orders'?s.activeTab:''} onClick={()=>setBottomTab('orders')}>주문내역</button>
        <button className={bottomTab==='fills'?s.activeTab:''} onClick={()=>setBottomTab('fills')}>체결내역</button>
        <button className={bottomTab==='funding'?s.activeTab:''} onClick={()=>setBottomTab('funding')}>Funding</button>
        {bottomTab==='open'&&activeOrders.length>0&&<button className={s.cancelAll} disabled={busy} onClick={cancelAll}>전체 취소</button>}
      </div>

      <div className={s.tableWrap}>
        {bottomTab==='positions'&&<table><thead><tr><th>Symbol</th><th>Side</th><th>Size</th><th>Entry</th><th>Mark</th><th>Liq. Price</th><th>Margin</th><th>PNL</th><th>ROE</th><th>TP / SL</th></tr></thead><tbody>{positions.length?positions.map(p=><tr key={p.id}><td><b>{p.symbol}</b></td><td className={p.side==='LONG'?s.up:s.down}>{p.side} · {p.leverage}x · {p.margin_mode}</td><td>{priceFmt(p.size,qtyDigits)}</td><td>{priceFmt(p.entry_price,priceDigits)}</td><td>{priceFmt(p.mark_price,priceDigits)}</td><td>{priceFmt(p.liquidation_price,priceDigits)}</td><td>{priceFmt(p.margin,2)}</td><td className={num(p.unrealized_pnl)>=0?s.up:s.down}>{priceFmt(p.unrealized_pnl,2)}</td><td className={num(p.roe)>=0?s.up:s.down}>{num(p.roe).toFixed(2)}%</td><td>{p.take_profit?priceFmt(p.take_profit,priceDigits):'—'} / {p.stop_loss?priceFmt(p.stop_loss,priceDigits):'—'}</td></tr>):<EmptyRow cols={10} loggedIn={loggedIn}/>}</tbody></table>}
        {bottomTab==='open'&&<table><thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Type</th><th>Price</th><th>Qty</th><th>Filled</th><th>Status</th><th/></tr></thead><tbody>{activeOrders.length?activeOrders.map(o=><tr key={o.id}><td>{dateTime(o.created_at)}</td><td><b>{o.symbol}</b></td><td className={o.side==='BUY'?s.up:s.down}>{o.side}</td><td>{o.order_type}</td><td>{priceFmt(o.price??o.trigger_price,priceDigits)}</td><td>{priceFmt(o.quantity,qtyDigits)}</td><td>{priceFmt(o.filled_quantity,qtyDigits)}</td><td>{o.status}</td><td><button className={s.cancelBtn} onClick={()=>cancelOrder(o.id)}>취소</button></td></tr>):<EmptyRow cols={9} loggedIn={loggedIn}/>}</tbody></table>}
        {bottomTab==='orders'&&<table><thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Type</th><th>Requested</th><th>Avg Fill</th><th>Qty</th><th>Fee</th><th>Status</th></tr></thead><tbody>{snapshot?.orders?.length?snapshot.orders.map(o=><tr key={o.id}><td>{dateTime(o.created_at)}</td><td>{o.symbol}</td><td className={o.side==='BUY'?s.up:s.down}>{o.side}</td><td>{o.order_type}</td><td>{priceFmt(o.price??o.trigger_price,priceDigits)}</td><td>{priceFmt(o.average_fill_price,priceDigits)}</td><td>{priceFmt(o.quantity,qtyDigits)}</td><td>{priceFmt(o.fee,4)}</td><td title={o.rejection_reason||''}>{o.status}</td></tr>):<EmptyRow cols={9} loggedIn={loggedIn}/>}</tbody></table>}
        {bottomTab==='fills'&&<table><thead><tr><th>Time</th><th>Price</th><th>Quantity</th><th>Role</th><th>Fee</th><th>Realized PNL</th></tr></thead><tbody>{snapshot?.fills?.length?snapshot.fills.map(f=><tr key={f.id}><td>{dateTime(f.created_at)}</td><td>{priceFmt(f.price,priceDigits)}</td><td>{priceFmt(f.quantity,qtyDigits)}</td><td>{f.liquidity_role}</td><td>{priceFmt(f.fee,4)}</td><td className={num(f.realized_pnl)>=0?s.up:s.down}>{priceFmt(f.realized_pnl,2)}</td></tr>):<EmptyRow cols={6} loggedIn={loggedIn}/>}</tbody></table>}
        {bottomTab==='funding'&&<table><thead><tr><th>Time</th><th>Symbol</th><th>Rate</th><th>Notional</th><th>Amount</th></tr></thead><tbody>{snapshot?.funding?.length?snapshot.funding.map(f=><tr key={f.id}><td>{dateTime(f.funding_time)}</td><td>{f.symbol}</td><td>{pct(f.rate,4)}</td><td>{priceFmt(f.notional,2)}</td><td className={num(f.amount)>=0?s.up:s.down}>{priceFmt(f.amount,4)}</td></tr>):<EmptyRow cols={5} loggedIn={loggedIn}/>}</tbody></table>}
      </div>
    </section>
  </main>;
}

function EmptyRow({cols,loggedIn}:{cols:number;loggedIn:boolean}){
  return <tr><td colSpan={cols} className={s.empty}>{loggedIn?'표시할 내역이 없습니다.':'로그인하면 선물 계정과 거래 내역을 확인할 수 있습니다.'}</td></tr>;
}
