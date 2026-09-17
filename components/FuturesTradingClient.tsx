'use client';

import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import BinanceMarketDepth from './BinanceMarketDepth';
import s from './FuturesTrading.module.css';

type Market={symbol:string;display_name:string;base_asset:string;quote_asset:string;enabled:boolean;trading_status:string;last_price:number;mark_price:number;index_price:number;bid:number;ask:number;change_pct:number;high_24h:number;low_24h:number;volume:number;quote_volume:number;funding_rate:number;next_funding_time:string;max_leverage:number;maker_fee:number;taker_fee:number;maintenance_margin_rate:number;quantity_precision:number;price_precision:number;min_order_size:number;max_order_size:number;min_notional:number;max_notional:number;stale:boolean};
type MarketsPayload={settings:{enabled:boolean;max_price_age_seconds:number}|null;health:{prices_at:string|null;risk_at:string|null;funding_at:string|null;last_error:string|null}|null;markets:Market[]};
type Account={balance:number;realized_pnl:number;trading_fees:number;funding:number;position_mode:'ONE_WAY'|'HEDGE'|string;status:string;available_balance?:number;wallet_balance?:number;used_margin?:number;unrealized_pnl?:number;withdrawable_balance?:number};
type Position={id:string;symbol:string;position_side:string;side:'LONG'|'SHORT';size:number;leverage:number;margin_mode:string;margin:number;entry_price:number;mark_price:number;liquidation_price:number|null;unrealized_pnl:number;realized_pnl:number;roe:number;take_profit:number|null;stop_loss:number|null;trigger_by?:string;accumulated_funding:number;opening_fee:number;closing_fee:number;status:string;created_at:string};
type Order={id:string;client_order_id:string;symbol:string;side:string;position_side:string;order_type:string;margin_mode:string;leverage:number;price:number|null;trigger_price:number|null;trigger_by?:string;trigger_order_type?:string;activation_price?:number|null;callback_rate?:number|null;quantity:number;filled_quantity:number;remaining_quantity:number;average_fill_price:number|null;reduce_only:boolean;post_only:boolean;time_in_force:string;take_profit:number|null;stop_loss:number|null;status:string;fee:number;rejection_reason:string|null;created_at:string;completed_at:string|null};
type Fill={id:string;order_id:string;position_id:string;price:number;quantity:number;realized_pnl:number;fee:number;liquidity_role:string;created_at:string};
type Funding={id:string;position_id:string;symbol:string;funding_time:string;rate:number;notional:number;amount:number;created_at:string};
type Snapshot={account:Account|null;positions:Position[];orders:Order[];fills:Fill[];ledger:any[];history:Position[];funding:Funding[]};
type Preview={order_value:number;required_margin:number;estimated_fee:number;estimated_liquidation_price:number;available_balance:number;leverage:number;note:string};
type BottomTab='positions'|'open'|'orders'|'fills'|'funding';
type BookTab='book'|'recent';
type OrderType='MARKET'|'LIMIT'|'TRIGGER'|'TRAILING_STOP';
type MarginMode='CROSS'|'ISOLATED';
type TriggerBy='MARK'|'LAST';
type TimeInForce='GTC'|'IOC'|'FOK';

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
  const [triggerBy,setTriggerBy]=useState<TriggerBy>('MARK');
  const [triggerOrderType,setTriggerOrderType]=useState<'MARKET'|'LIMIT'>('MARKET');
  const [timeInForce,setTimeInForce]=useState<TimeInForce>('GTC');
  const [activationPrice,setActivationPrice]=useState('');
  const [callbackRate,setCallbackRate]=useState('0.5');
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
  const positionMode=snapshot?.account?.position_mode||'ONE_WAY';
  const canTrade=loggedIn&&settingsEnabled&&!!market&&!market.stale&&market.enabled&&market.trading_status==='ACTIVE';

  async function loadMarkets(){const {data,error}=await supabase.rpc('futures_markets');if(error)return;const p=(data||{}) as MarketsPayload;const rows=Array.isArray(p.markets)?p.markets:[];setMarketsPayload({...p,markets:rows});if(rows.length&&!rows.some(x=>x.symbol===symbol))setSymbol(rows[0].symbol)}
  async function loadSnapshot(){const {data:{user}}=await supabase.auth.getUser();setLoggedIn(!!user);if(!user){setSnapshot(null);return}const {data,error}=await supabase.rpc('futures_action',{p_action:'snapshot',p_payload:{}});if(!error&&data)setSnapshot(data as Snapshot)}

  useEffect(()=>{let alive=true;const init=async()=>{if(!alive)return;await Promise.all([loadMarkets(),loadSnapshot()])};init();const m=setInterval(()=>{if(alive)loadMarkets()},1500);const a=setInterval(()=>{if(alive)loadSnapshot()},2500);const n=setInterval(()=>setNow(Date.now()),1000);const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>loadSnapshot());return()=>{alive=false;clearInterval(m);clearInterval(a);clearInterval(n);subscription.unsubscribe()}},[supabase,symbol]);
  useEffect(()=>{if(!market)return;if(orderType==='LIMIT'&&!price)setPrice(String(Number(market.last_price).toFixed(priceDigits)));if(orderType==='TRIGGER'&&!triggerPrice)setTriggerPrice(String(Number(market.last_price).toFixed(priceDigits)));if(orderType==='TRAILING_STOP'){setReduceOnly(true);setPostOnly(false);setTimeInForce('GTC')}},[symbol,orderType,market?.last_price]);

  useEffect(()=>{let dead=false;const q=Number(quantity);if(!loggedIn||!market||!Number.isFinite(q)||q<=0||orderType==='TRAILING_STOP'){setPreview(null);return}const id=setTimeout(async()=>{const payload:any={symbol:market.symbol,side:'BUY',orderType,marginMode,leverage,quantity:q};if(orderType==='LIMIT')payload.price=Number(price);if(orderType==='TRIGGER'&&triggerOrderType==='LIMIT')payload.price=Number(price);const {data,error}=await supabase.rpc('futures_action',{p_action:'preview',p_payload:payload});if(!dead&&!error)setPreview(data as Preview);if(!dead&&error)setPreview(null)},250);return()=>{dead=true;clearTimeout(id)}},[loggedIn,market?.symbol,quantity,leverage,marginMode,orderType,price,triggerOrderType,supabase]);

  const fundingMs=market?.next_funding_time?Math.max(0,new Date(market.next_funding_time).getTime()-now):0;
  const fundingText=`${String(Math.floor(fundingMs/3600000)).padStart(2,'0')}:${String(Math.floor((fundingMs%3600000)/60000)).padStart(2,'0')}:${String(Math.floor((fundingMs%60000)/1000)).padStart(2,'0')}`;
  const setRatio=(ratio:number)=>{if(!market||!snapshot?.account)return;const available=num(snapshot.account.available_balance);const ref=orderType==='LIMIT'?num(price):num(market.ask);if(ref<=0)return;const q=(available*ratio*leverage/ref);const f=Math.floor(q*Math.pow(10,qtyDigits))/Math.pow(10,qtyDigits);setQuantity(String(Math.max(0,f)))};

  async function submit(side:'BUY'|'SELL'){
    setMessage('');if(!loggedIn){setMessage('로그인 후 선물거래를 이용할 수 있습니다.');return}if(!settingsEnabled){setMessage('현재 선물 신규 거래가 관리자 설정에서 비활성화되어 있습니다.');return}if(!market||market.stale){setMessage('실시간 선물 시세를 확인 중입니다.');return}const q=Number(quantity);if(!Number.isFinite(q)||q<=0){setMessage('주문 수량을 확인하세요.');return}
    const positionSide=positionMode==='HEDGE'?(reduceOnly?(side==='BUY'?'SHORT':'LONG'):(side==='BUY'?'LONG':'SHORT')):'BOTH';
    const payload:any={symbol:market.symbol,side,positionSide,orderType,marginMode,leverage,quantity:q,clientOrderId:`web-${crypto.randomUUID()}`,reduceOnly:orderType==='TRAILING_STOP'?true:reduceOnly,postOnly:orderType==='LIMIT'?postOnly:false,timeInForce:orderType==='LIMIT'?(postOnly?'POST_ONLY':timeInForce):'GTC',triggerBy};
    if(orderType==='LIMIT')payload.price=Number(price);
    if(orderType==='TRIGGER'){payload.triggerPrice=Number(triggerPrice);payload.triggerDirection=triggerDirection;payload.triggerOrderType=triggerOrderType;if(triggerOrderType==='LIMIT')payload.price=Number(price)}
    if(orderType==='TRAILING_STOP'){payload.callbackRate=Number(callbackRate)/100;if(activationPrice)payload.activationPrice=Number(activationPrice)}
    if(takeProfit)payload.takeProfit=Number(takeProfit);if(stopLoss)payload.stopLoss=Number(stopLoss);
    setBusy(true);try{const {data,error}=await supabase.rpc('futures_action',{p_action:'order',p_payload:payload});if(error)throw error;const order=data as Order;setMessage(order.status==='FILLED'?'주문이 체결되었습니다.':order.status==='REJECTED'?(order.rejection_reason||'주문이 거부되었습니다.'):'주문이 접수되었습니다.');await loadSnapshot()}catch(e:any){setMessage(String(e?.message||'주문 처리 중 오류가 발생했습니다.'))}finally{setBusy(false)}
  }

  async function callAction(action:string,payload:any,ok:string){setBusy(true);setMessage('');try{const {error}=await supabase.rpc('futures_action',{p_action:action,p_payload:payload});if(error)throw error;setMessage(ok);await loadSnapshot()}catch(e:any){setMessage(String(e?.message||'처리 중 오류가 발생했습니다.'))}finally{setBusy(false)}}
  async function cancelOrder(orderId:string){await callAction('cancel',{orderId},'주문을 취소했습니다.')}
  async function cancelAll(){await callAction('cancel_all',{},'미체결 주문을 모두 취소했습니다.')}
  async function changePositionMode(mode:'ONE_WAY'|'HEDGE'){if(mode===positionMode)return;await callAction('position_mode',{mode},mode==='HEDGE'?'헤지 모드로 변경했습니다.':'단방향 모드로 변경했습니다.')}
  async function editTPSL(p:Position){const tp=window.prompt('Take Profit 가격 (비우면 해제)',p.take_profit?String(p.take_profit):'');if(tp===null)return;const sl=window.prompt('Stop Loss 가격 (비우면 해제)',p.stop_loss?String(p.stop_loss):'');if(sl===null)return;await callAction('position_tpsl',{positionId:p.id,takeProfit:tp.trim()?Number(tp):null,stopLoss:sl.trim()?Number(sl):null,triggerBy:'MARK'},'TP/SL을 변경했습니다.')}
  async function addMargin(p:Position){const value=window.prompt('추가할 격리 증거금(USDT)','10');if(value===null)return;const amount=Number(value);if(!Number.isFinite(amount)||amount<=0){setMessage('추가 증거금을 확인하세요.');return}await callAction('position_margin',{positionId:p.id,amount,clientOrderId:`margin-${crypto.randomUUID()}`},'격리 증거금을 추가했습니다.')}
  async function changeLeverage(p:Position){const pm=marketsPayload.markets.find(x=>x.symbol===p.symbol);const value=window.prompt(`변경 레버리지 (1~${pm?.max_leverage||100})`,String(p.leverage));if(value===null)return;const next=Number(value);if(!Number.isInteger(next)||next<1||next>(pm?.max_leverage||100)){setMessage('허용 레버리지를 확인하세요.');return}await callAction('position_leverage',{positionId:p.id,leverage:next},'포지션 레버리지를 변경했습니다.')}
  async function closePosition(p:Position,ratio:number){const pm=marketsPayload.markets.find(x=>x.symbol===p.symbol);if(!pm){setMessage('종목 정보를 찾을 수 없습니다.');return}const scale=Math.pow(10,pm.quantity_precision);let q=ratio>=1?num(p.size):Math.floor(num(p.size)*ratio*scale)/scale;if(q<=0){setMessage('청산 가능한 수량이 없습니다.');return}const side=p.side==='LONG'?'SELL':'BUY';const positionSide=positionMode==='HEDGE'?p.position_side:'BOTH';await callAction('order',{symbol:p.symbol,side,positionSide,orderType:'MARKET',marginMode:p.margin_mode,leverage:p.leverage,quantity:q,clientOrderId:`close-${crypto.randomUUID()}`,reduceOnly:true,postOnly:false,timeInForce:'GTC',triggerBy:'MARK'},`${Math.round(ratio*100)}% 청산 주문을 전송했습니다.`)}

  return <main className={s.page}>
    {message&&<div className={s.toast} onClick={()=>setMessage('')}>{message}</div>}
    <section className={s.marketHeader}><div className={s.symbolCell}><select value={market?.symbol||symbol} onChange={e=>setSymbol(e.target.value)} aria-label="선물 종목 선택">{marketsPayload.markets.map(m=><option key={m.symbol} value={m.symbol}>{m.display_name||m.symbol} Perpetual</option>)}</select><small>USDT-M · Perpetual</small></div><div className={s.priceCell}><strong className={num(market?.change_pct)>=0?s.up:s.down}>{priceFmt(market?.last_price,priceDigits)}</strong><span>{num(market?.change_pct)>=0?'+':''}{num(market?.change_pct).toFixed(2)}%</span></div><div className={s.metric}><span>Mark Price</span><b>{priceFmt(market?.mark_price,priceDigits)}</b></div><div className={s.metric}><span>Index Price</span><b>{priceFmt(market?.index_price,priceDigits)}</b></div><div className={s.metric}><span>24H High</span><b>{priceFmt(market?.high_24h,priceDigits)}</b></div><div className={s.metric}><span>24H Low</span><b>{priceFmt(market?.low_24h,priceDigits)}</b></div><div className={s.metric}><span>24H Volume</span><b>{compact(market?.quote_volume)} USDT</b></div><div className={s.metric}><span>Funding / Next</span><b className={num(market?.funding_rate)>=0?s.up:s.down}>{pct(market?.funding_rate,4)} · {fundingText}</b></div></section>
    {!settingsEnabled&&<div className={s.systemBanner}>선물거래 엔진은 연결되어 있으나 현재 신규 진입은 비활성화 상태입니다. 시세·포지션·내역 조회는 정상 동작합니다.</div>}

    <section className={s.terminal}>
      <section className={`${s.panel} ${s.chartPanel}`}><div className={s.panelHead}><div><button className={s.activeTab}>차트</button><button>정보</button></div><span className={s.live}><i/> LIVE · Binance USDT-M</span></div><div className={s.chartStage} data-symbol={market?.symbol||'BTCUSDT'}/></section>
      <section className={s.panel}><div className={s.panelHead}><div><button className={bookTab==='book'?s.activeTab:''} onClick={()=>setBookTab('book')}>호가</button><button className={bookTab==='recent'?s.activeTab:''} onClick={()=>setBookTab('recent')}>최근 체결</button></div></div>{market?<BinanceMarketDepth symbol={market.symbol} currentPrice={num(market.last_price)} mode={bookTab} classNames={{bookBody:s.bookBody,bookHead:s.bookHead,bookRows:s.bookRows,bookRow:s.bookRow,askDepth:s.askDepth,bidDepth:s.bidDepth,midPrice:s.midPrice,bookStatus:s.bookStatus,recentList:s.recentList,empty:s.empty}} futures/>:<div className={s.empty}>시장을 불러오는 중입니다.</div>}</section>

      <section className={`${s.panel} ${s.orderPanel}`}>
        <div className={s.modeBar}><span>Position Mode</span><div><button disabled={!loggedIn||busy} className={positionMode==='ONE_WAY'?s.selectedPill:''} onClick={()=>changePositionMode('ONE_WAY')}>One-Way</button><button disabled={!loggedIn||busy} className={positionMode==='HEDGE'?s.selectedPill:''} onClick={()=>changePositionMode('HEDGE')}>Hedge</button></div></div>
        <div className={s.orderTop}><button className={marginMode==='CROSS'?s.selectedPill:''} onClick={()=>setMarginMode('CROSS')}>Cross</button><button className={marginMode==='ISOLATED'?s.selectedPill:''} onClick={()=>setMarginMode('ISOLATED')}>Isolated</button><label><input type="number" min={1} max={market?.max_leverage||100} value={leverage} onChange={e=>setLeverage(Math.max(1,Math.min(market?.max_leverage||100,Number(e.target.value)||1)))}/><span>x</span></label></div>
        <div className={s.orderTabs}>{(['MARKET','LIMIT','TRIGGER','TRAILING_STOP'] as OrderType[]).map(t=><button key={t} className={orderType===t?s.activeTab:''} onClick={()=>setOrderType(t)}>{t==='TRAILING_STOP'?'Trailing':t[0]+t.slice(1).toLowerCase()}</button>)}</div>
        <div className={s.available}><span>Available</span><b>{loggedIn?`${priceFmt(snapshot?.account?.available_balance,2)} USDT`:'로그인 필요'}</b></div>

        {orderType==='LIMIT'&&<><label className={s.inputRow}><span>Price</span><input value={price} onChange={e=>setPrice(e.target.value)} inputMode="decimal"/><em>USDT</em></label><div className={s.microControls}><span>Time in Force</span>{(['GTC','IOC','FOK'] as TimeInForce[]).map(x=><button key={x} className={timeInForce===x?s.selectedPill:''} onClick={()=>{setTimeInForce(x);if(x!=='GTC')setPostOnly(false)}}>{x}</button>)}</div></>}
        {orderType==='TRIGGER'&&<><div className={s.microControls}><span>Trigger By</span><button className={triggerBy==='MARK'?s.selectedPill:''} onClick={()=>setTriggerBy('MARK')}>Mark</button><button className={triggerBy==='LAST'?s.selectedPill:''} onClick={()=>setTriggerBy('LAST')}>Last</button></div><label className={s.inputRow}><span>Trigger Price</span><input value={triggerPrice} onChange={e=>setTriggerPrice(e.target.value)} inputMode="decimal"/><em>USDT</em></label><div className={s.triggerDir}><button className={triggerDirection==='ABOVE'?s.selectedPill:''} onClick={()=>setTriggerDirection('ABOVE')}>이상 도달</button><button className={triggerDirection==='BELOW'?s.selectedPill:''} onClick={()=>setTriggerDirection('BELOW')}>이하 도달</button></div><div className={s.microControls}><span>체결 방식</span><button className={triggerOrderType==='MARKET'?s.selectedPill:''} onClick={()=>setTriggerOrderType('MARKET')}>Market</button><button className={triggerOrderType==='LIMIT'?s.selectedPill:''} onClick={()=>setTriggerOrderType('LIMIT')}>Limit</button></div>{triggerOrderType==='LIMIT'&&<label className={s.inputRow}><span>Order Price</span><input value={price} onChange={e=>setPrice(e.target.value)} inputMode="decimal"/><em>USDT</em></label>}</>}
        {orderType==='TRAILING_STOP'&&<><div className={s.microControls}><span>Trigger By</span><button className={triggerBy==='MARK'?s.selectedPill:''} onClick={()=>setTriggerBy('MARK')}>Mark</button><button className={triggerBy==='LAST'?s.selectedPill:''} onClick={()=>setTriggerBy('LAST')}>Last</button></div><label className={s.inputRow}><span>Activation (선택)</span><input value={activationPrice} onChange={e=>setActivationPrice(e.target.value)} inputMode="decimal"/><em>USDT</em></label><label className={s.inputRow}><span>Callback</span><input value={callbackRate} onChange={e=>setCallbackRate(e.target.value)} inputMode="decimal"/><em>%</em></label></>}

        <label className={s.inputRow}><span>Quantity</span><input value={quantity} onChange={e=>setQuantity(e.target.value)} inputMode="decimal"/><em>{market?.base_asset||'BTC'}</em></label>
        <div className={s.ratios}>{[.25,.5,.75,1].map(r=><button key={r} onClick={()=>setRatio(r)}>{Math.round(r*100)}%</button>)}</div>
        {orderType!=='TRAILING_STOP'&&<div className={s.tpsl}><label><span>Take Profit</span><input value={takeProfit} onChange={e=>setTakeProfit(e.target.value)} inputMode="decimal" placeholder="선택"/></label><label><span>Stop Loss</span><input value={stopLoss} onChange={e=>setStopLoss(e.target.value)} inputMode="decimal" placeholder="선택"/></label></div>}
        <div className={s.options}><label><input type="checkbox" checked={orderType==='TRAILING_STOP'||reduceOnly} disabled={orderType==='TRAILING_STOP'} onChange={e=>setReduceOnly(e.target.checked)}/> Reduce Only</label><label><input type="checkbox" checked={postOnly} disabled={orderType!=='LIMIT'||timeInForce!=='GTC'} onChange={e=>setPostOnly(e.target.checked)}/> Post Only</label></div>
        <div className={s.preview}><div><span>Order Value</span><b>{priceFmt(preview?.order_value,2)}</b></div><div><span>Required Margin</span><b>{priceFmt(preview?.required_margin,2)}</b></div><div><span>Estimated Fee</span><b>{priceFmt(preview?.estimated_fee,4)}</b></div><div><span>Est. Liq. Price</span><b>{priceFmt(preview?.estimated_liquidation_price,priceDigits)}</b></div></div>
        <div className={s.tradeButtons}><button disabled={busy||!canTrade} className={s.longBtn} onClick={()=>submit('BUY')}>{positionMode==='HEDGE'&&reduceOnly?'숏 청산':'매수 / 롱'}</button><button disabled={busy||!canTrade} className={s.shortBtn} onClick={()=>submit('SELL')}>{positionMode==='HEDGE'&&reduceOnly?'롱 청산':'매도 / 숏'}</button></div>
        <p className={s.orderNote}>수수료·증거금·PNL·청산가격·체결은 서버 Futures Engine이 최종 확정합니다.</p>
      </section>
    </section>

    <section className={s.accountStrip}><div><span>Wallet Balance</span><b>{loggedIn?priceFmt(snapshot?.account?.balance,2):'—'}</b></div><div><span>Available</span><b>{loggedIn?priceFmt(snapshot?.account?.available_balance,2):'—'}</b></div><div><span>Used Margin</span><b>{loggedIn?priceFmt(snapshot?.account?.used_margin,2):'—'}</b></div><div><span>Unrealized PNL</span><b className={num(snapshot?.account?.unrealized_pnl)>=0?s.up:s.down}>{loggedIn?priceFmt(snapshot?.account?.unrealized_pnl,2):'—'}</b></div><div><span>Realized PNL</span><b className={num(snapshot?.account?.realized_pnl)>=0?s.up:s.down}>{loggedIn?priceFmt(snapshot?.account?.realized_pnl,2):'—'}</b></div></section>

    <section className={`${s.panel} ${s.bottomPanel}`}><div className={s.bottomTabs}><button className={bottomTab==='positions'?s.activeTab:''} onClick={()=>setBottomTab('positions')}>포지션 ({positions.length})</button><button className={bottomTab==='open'?s.activeTab:''} onClick={()=>setBottomTab('open')}>미체결 주문 ({activeOrders.length})</button><button className={bottomTab==='orders'?s.activeTab:''} onClick={()=>setBottomTab('orders')}>주문내역</button><button className={bottomTab==='fills'?s.activeTab:''} onClick={()=>setBottomTab('fills')}>체결내역</button><button className={bottomTab==='funding'?s.activeTab:''} onClick={()=>setBottomTab('funding')}>Funding</button>{bottomTab==='open'&&activeOrders.length>0&&<button className={s.cancelAll} disabled={busy} onClick={cancelAll}>전체 취소</button>}</div>
      <div className={s.tableWrap}>
        {bottomTab==='positions'&&<table><thead><tr><th>Symbol</th><th>Side</th><th>Size</th><th>Entry</th><th>Mark</th><th>Liq. Price</th><th>Margin</th><th>PNL</th><th>ROE</th><th>TP / SL</th><th>관리</th></tr></thead><tbody>{positions.length?positions.map(p=>{const pm=marketsPayload.markets.find(x=>x.symbol===p.symbol);return <tr key={p.id}><td><b>{p.symbol}</b></td><td className={p.side==='LONG'?s.up:s.down}>{p.side} · {p.leverage}x · {p.margin_mode}</td><td>{priceFmt(p.size,pm?.quantity_precision??3)}</td><td>{priceFmt(p.entry_price,pm?.price_precision??2)}</td><td>{priceFmt(p.mark_price,pm?.price_precision??2)}</td><td>{priceFmt(p.liquidation_price,pm?.price_precision??2)}</td><td>{priceFmt(p.margin,2)}</td><td className={num(p.unrealized_pnl)>=0?s.up:s.down}>{priceFmt(p.unrealized_pnl,2)}</td><td className={num(p.roe)>=0?s.up:s.down}>{num(p.roe).toFixed(2)}%</td><td>{p.take_profit?priceFmt(p.take_profit,pm?.price_precision??2):'—'} / {p.stop_loss?priceFmt(p.stop_loss,pm?.price_precision??2):'—'}</td><td><div className={s.positionActions}><button disabled={busy} onClick={()=>editTPSL(p)}>TP/SL</button>{p.margin_mode==='ISOLATED'&&<button disabled={busy} onClick={()=>addMargin(p)}>증거금+</button>}<button disabled={busy} onClick={()=>changeLeverage(p)}>레버리지</button>{[.25,.5,.75,1].map(r=><button disabled={busy} key={r} className={r===1?s.closeAll:''} onClick={()=>closePosition(p,r)}>{Math.round(r*100)}%</button>)}</div></td></tr>}):<EmptyRow cols={11} loggedIn={loggedIn}/>}</tbody></table>}
        {bottomTab==='open'&&<table><thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Type</th><th>Price</th><th>Qty</th><th>Filled</th><th>TIF</th><th>Status</th><th/></tr></thead><tbody>{activeOrders.length?activeOrders.map(o=><tr key={o.id}><td>{dateTime(o.created_at)}</td><td><b>{o.symbol}</b></td><td className={o.side==='BUY'?s.up:s.down}>{o.side}</td><td>{o.order_type}</td><td>{priceFmt(o.price??o.trigger_price,marketsPayload.markets.find(x=>x.symbol===o.symbol)?.price_precision??2)}</td><td>{priceFmt(o.quantity,marketsPayload.markets.find(x=>x.symbol===o.symbol)?.quantity_precision??3)}</td><td>{priceFmt(o.filled_quantity,marketsPayload.markets.find(x=>x.symbol===o.symbol)?.quantity_precision??3)}</td><td>{o.time_in_force}</td><td>{o.status}</td><td><button className={s.cancelBtn} disabled={busy} onClick={()=>cancelOrder(o.id)}>취소</button></td></tr>):<EmptyRow cols={10} loggedIn={loggedIn}/>}</tbody></table>}
        {bottomTab==='orders'&&<table><thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Type</th><th>Requested</th><th>Avg Fill</th><th>Qty</th><th>Fee</th><th>Status</th></tr></thead><tbody>{snapshot?.orders?.length?snapshot.orders.map(o=><tr key={o.id}><td>{dateTime(o.created_at)}</td><td>{o.symbol}</td><td className={o.side==='BUY'?s.up:s.down}>{o.side}</td><td>{o.order_type}</td><td>{priceFmt(o.price??o.trigger_price,marketsPayload.markets.find(x=>x.symbol===o.symbol)?.price_precision??2)}</td><td>{priceFmt(o.average_fill_price,marketsPayload.markets.find(x=>x.symbol===o.symbol)?.price_precision??2)}</td><td>{priceFmt(o.quantity,marketsPayload.markets.find(x=>x.symbol===o.symbol)?.quantity_precision??3)}</td><td>{priceFmt(o.fee,4)}</td><td title={o.rejection_reason||''}>{o.status}</td></tr>):<EmptyRow cols={9} loggedIn={loggedIn}/>}</tbody></table>}
        {bottomTab==='fills'&&<table><thead><tr><th>Time</th><th>Price</th><th>Quantity</th><th>Role</th><th>Fee</th><th>Realized PNL</th></tr></thead><tbody>{snapshot?.fills?.length?snapshot.fills.map(f=><tr key={f.id}><td>{dateTime(f.created_at)}</td><td>{priceFmt(f.price,priceDigits)}</td><td>{priceFmt(f.quantity,qtyDigits)}</td><td>{f.liquidity_role}</td><td>{priceFmt(f.fee,4)}</td><td className={num(f.realized_pnl)>=0?s.up:s.down}>{priceFmt(f.realized_pnl,2)}</td></tr>):<EmptyRow cols={6} loggedIn={loggedIn}/>}</tbody></table>}
        {bottomTab==='funding'&&<table><thead><tr><th>Time</th><th>Symbol</th><th>Rate</th><th>Notional</th><th>Amount</th></tr></thead><tbody>{snapshot?.funding?.length?snapshot.funding.map(f=><tr key={f.id}><td>{dateTime(f.funding_time)}</td><td>{f.symbol}</td><td>{pct(f.rate,4)}</td><td>{priceFmt(f.notional,2)}</td><td className={num(f.amount)>=0?s.up:s.down}>{priceFmt(f.amount,4)}</td></tr>):<EmptyRow cols={5} loggedIn={loggedIn}/>}</tbody></table>}
      </div>
    </section>
  </main>;
}

function EmptyRow({cols,loggedIn}:{cols:number;loggedIn:boolean}){return <tr><td colSpan={cols} className={s.empty}>{loggedIn?'표시할 내역이 없습니다.':'로그인하면 선물 계정과 거래 내역을 확인할 수 있습니다.'}</td></tr>}
