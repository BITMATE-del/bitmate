'use client';

import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import BinanceMarketDepth from './BinanceMarketDepth';
import FuturesMarketSelector,{type FuturesFeedMarket} from './FuturesMarketSelector';
import s from './FuturesTrading.module.css';

type EngineMarket={symbol:string;display_name:string;base_asset:string;quote_asset:string;enabled:boolean;trading_status:string;last_price:number;mark_price:number;index_price:number;bid:number;ask:number;change_pct:number;high_24h:number;low_24h:number;volume:number;quote_volume:number;funding_rate:number;next_funding_time:string;max_leverage:number;maker_fee:number;taker_fee:number;maintenance_margin_rate:number;quantity_precision:number;price_precision:number;min_order_size:number;max_order_size:number;min_notional:number;max_notional:number;stale:boolean};
type MarketsPayload={settings:{enabled:boolean;max_price_age_seconds:number}|null;health:{prices_at:string|null;risk_at:string|null;funding_at:string|null;last_error:string|null}|null;markets:EngineMarket[]};
type Account={balance:number;realized_pnl:number;trading_fees:number;funding:number;position_mode:'ONE_WAY'|'HEDGE'|string;status:string;available_balance?:number;wallet_balance?:number;used_margin?:number;unrealized_pnl?:number;withdrawable_balance?:number};
type Position={id:string;symbol:string;position_side:string;side:'LONG'|'SHORT';size:number;leverage:number;margin_mode:string;margin:number;entry_price:number;mark_price:number;liquidation_price:number|null;unrealized_pnl:number;realized_pnl:number;roe:number;take_profit:number|null;stop_loss:number|null;accumulated_funding:number;opening_fee:number;closing_fee:number;status:string;created_at:string};
type Order={id:string;client_order_id:string;symbol:string;side:string;position_side:string;order_type:string;margin_mode:string;leverage:number;price:number|null;trigger_price:number|null;quantity:number;filled_quantity:number;remaining_quantity:number;average_fill_price:number|null;reduce_only:boolean;post_only:boolean;time_in_force:string;take_profit:number|null;stop_loss:number|null;status:string;fee:number;rejection_reason:string|null;created_at:string;completed_at:string|null};
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
type TradeSide='BUY'|'SELL';

const num=(v:any)=>Number(v||0);
const priceFmt=(v:any,p=2)=>{const n=Number(v);if(!Number.isFinite(n)||n===0)return '—';return n.toLocaleString(undefined,{minimumFractionDigits:p,maximumFractionDigits:p})};
const compact=(v:any)=>{const n=Number(v);return Number.isFinite(n)?new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(n):'—'};
const pct=(v:any,d=2)=>`${num(v)>=0?'+':''}${(num(v)*100).toFixed(d)}%`;
const dateTime=(v:string|null|undefined)=>v?new Date(v).toLocaleString('ko-KR',{hour12:false}):'—';

export default function FuturesTradingClient(){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [marketsPayload,setMarketsPayload]=useState<MarketsPayload>({settings:null,health:null,markets:[]});
  const [feedMarkets,setFeedMarkets]=useState<FuturesFeedMarket[]>([]);
  const [symbol,setSymbol]=useState('BTCUSDT');
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [loggedIn,setLoggedIn]=useState(false);
  const [tradeSide,setTradeSide]=useState<TradeSide>('BUY');
  const [orderType,setOrderType]=useState<OrderType>('MARKET');
  const [marginMode,setMarginMode]=useState<MarginMode>('ISOLATED');
  const [leverage,setLeverage]=useState(10);
  const [orderValue,setOrderValue]=useState('100');
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

  const engineMarket=marketsPayload.markets.find(x=>x.symbol===symbol)||null;
  const feedMarket=feedMarkets.find(x=>x.symbol===symbol)||feedMarkets[0]||null;
  const currentSymbol=feedMarket?.symbol||engineMarket?.symbol||symbol;
  const baseAsset=feedMarket?.base||engineMarket?.base_asset||currentSymbol.replace(/USDT$/,'');
  const priceDigits=feedMarket?.pricePrecision??engineMarket?.price_precision??2;
  const qtyDigits=feedMarket?.quantityPrecision??engineMarket?.quantity_precision??3;
  const lastPrice=feedMarket?.lastPrice??engineMarket?.last_price??0;
  const markPrice=feedMarket?.markPrice??engineMarket?.mark_price??0;
  const indexPrice=feedMarket?.indexPrice??engineMarket?.index_price??0;
  const bid=feedMarket?.bid??engineMarket?.bid??0;
  const ask=feedMarket?.ask??engineMarket?.ask??0;
  const changePct=feedMarket?.changePct??engineMarket?.change_pct??0;
  const high24h=feedMarket?.high24h??engineMarket?.high_24h??0;
  const low24h=feedMarket?.low24h??engineMarket?.low_24h??0;
  const quoteVolume=feedMarket?.quoteVolume??engineMarket?.quote_volume??0;
  const fundingRate=feedMarket?.fundingRate??engineMarket?.funding_rate??0;
  const nextFundingTime=feedMarket?.nextFundingTime??(engineMarket?.next_funding_time?new Date(engineMarket.next_funding_time).getTime():0);
  const activeOrders=(snapshot?.orders||[]).filter(o=>['OPEN','PARTIALLY_FILLED','TRIGGER_WAITING','TRIGGERED'].includes(o.status));
  const positions=snapshot?.positions||[];
  const settingsEnabled=!!marketsPayload.settings?.enabled;
  const positionMode=snapshot?.account?.position_mode||'ONE_WAY';
  const engineReady=!!engineMarket&&engineMarket.enabled&&engineMarket.trading_status==='ACTIVE'&&!engineMarket.stale;
  const canTrade=loggedIn&&settingsEnabled&&engineReady;
  const referencePrice=orderType==='LIMIT'?num(price):orderType==='TRIGGER'&&triggerOrderType==='LIMIT'?num(price):num(tradeSide==='BUY'?(ask||lastPrice):(bid||lastPrice));
  const marginAmount=Math.max(0,num(orderValue));
  const positionValue=marginAmount*Math.max(1,leverage);
  const quantity=referencePrice>0?Math.floor((positionValue/referencePrice)*Math.pow(10,qtyDigits))/Math.pow(10,qtyDigits):0;

  async function loadEngineMarkets(){const {data,error}=await supabase.rpc('futures_markets');if(error)return;const p=(data||{}) as MarketsPayload;setMarketsPayload({...p,markets:Array.isArray(p.markets)?p.markets:[]})}
  async function loadFeedMarkets(){try{const r=await fetch('/api/futures/markets',{cache:'no-store'});if(!r.ok)return;const j=await r.json();const rows=(j.markets||[]) as FuturesFeedMarket[];if(rows.length){setFeedMarkets(rows);if(!rows.some(x=>x.symbol===symbol))setSymbol(rows[0].symbol)}}catch{}}
  async function loadSnapshot(){const {data:{user}}=await supabase.auth.getUser();setLoggedIn(!!user);if(!user){setSnapshot(null);return}const {data,error}=await supabase.rpc('futures_action',{p_action:'snapshot',p_payload:{}});if(!error&&data)setSnapshot(data as Snapshot)}

  useEffect(()=>{let alive=true;const init=async()=>{await Promise.all([loadEngineMarkets(),loadFeedMarkets(),loadSnapshot()])};init();const e=setInterval(()=>{if(alive)loadEngineMarkets()},5000);const f=setInterval(()=>{if(alive)loadFeedMarkets()},15000);const a=setInterval(()=>{if(alive)loadSnapshot()},2500);const n=setInterval(()=>setNow(Date.now()),1000);const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>loadSnapshot());return()=>{alive=false;clearInterval(e);clearInterval(f);clearInterval(a);clearInterval(n);subscription.unsubscribe()}},[supabase]);
  useEffect(()=>{let ws:WebSocket|null=null;let retry:ReturnType<typeof setTimeout>|null=null;let dead=false;const connect=()=>{if(dead)return;ws=new WebSocket('wss://fstream.binance.com/ws/!ticker@arr');ws.onmessage=ev=>{try{const arr=JSON.parse(ev.data) as any[];if(!Array.isArray(arr))return;const patch=new Map(arr.map(x=>[String(x.s),x]));setFeedMarkets(prev=>prev.map(m=>{const x=patch.get(m.symbol);return x?{...m,lastPrice:Number(x.c),changePct:Number(x.P),high24h:Number(x.h),low24h:Number(x.l),volume:Number(x.v),quoteVolume:Number(x.q)}:m}))}catch{}};ws.onclose=()=>{if(!dead)retry=setTimeout(connect,2500)};ws.onerror=()=>ws?.close()};connect();return()=>{dead=true;if(retry)clearTimeout(retry);ws?.close()}},[]);
  useEffect(()=>{setPrice('');setTriggerPrice('');setActivationPrice('')},[symbol]);
  useEffect(()=>{if(!lastPrice)return;if(orderType==='LIMIT'&&!price)setPrice(String(Number(lastPrice).toFixed(priceDigits)));if(orderType==='TRIGGER'&&!triggerPrice)setTriggerPrice(String(Number(markPrice||lastPrice).toFixed(priceDigits)));if(orderType==='TRAILING_STOP'){setReduceOnly(true);setPostOnly(false);setTimeInForce('GTC')}},[orderType,lastPrice,markPrice,priceDigits]);
  useEffect(()=>{let dead=false;const q=Number(quantity);if(!loggedIn||!engineMarket||!Number.isFinite(q)||q<=0||orderType==='TRAILING_STOP'){setPreview(null);return}const id=setTimeout(async()=>{const payload:any={symbol:engineMarket.symbol,side:tradeSide,orderType,marginMode,leverage,quantity:q};if(orderType==='LIMIT')payload.price=Number(price);if(orderType==='TRIGGER'&&triggerOrderType==='LIMIT')payload.price=Number(price);const {data,error}=await supabase.rpc('futures_action',{p_action:'preview',p_payload:payload});if(!dead&&!error)setPreview(data as Preview);if(!dead&&error)setPreview(null)},250);return()=>{dead=true;clearTimeout(id)}},[loggedIn,engineMarket?.symbol,quantity,leverage,marginMode,orderType,price,triggerOrderType,tradeSide,supabase]);

  const fundingMs=nextFundingTime?Math.max(0,nextFundingTime-now):0;
  const fundingText=`${String(Math.floor(fundingMs/3600000)).padStart(2,'0')}:${String(Math.floor((fundingMs%3600000)/60000)).padStart(2,'0')}:${String(Math.floor((fundingMs%60000)/1000)).padStart(2,'0')}`;
  const setRatio=(ratio:number)=>{if(!snapshot?.account)return;const available=num(snapshot.account.available_balance);if(available<=0)return;const feeRate=num(engineMarket?.taker_fee);const maxMargin=available/(1+Math.max(1,leverage)*feeRate);const value=Math.floor(maxMargin*ratio*100)/100;setOrderValue(String(Math.max(0,value)))};

  async function submit(side:TradeSide){
    setTradeSide(side);setMessage('');if(!loggedIn){setMessage('로그인 후 선물거래를 이용할 수 있습니다.');return}if(!settingsEnabled){setMessage('현재 선물 신규 주문이 일시 중지되어 있습니다.');return}if(!engineMarket){setMessage('현재 이 종목은 주문할 수 없습니다. 다른 거래 가능 종목을 선택하세요.');return}if(!engineReady){setMessage('현재 이 종목은 주문할 수 없는 상태입니다.');return}const q=Number(quantity);if(!Number.isFinite(q)||q<=0||marginAmount<=0){setMessage('주문 금액을 확인하세요.');return}
    const positionSide=positionMode==='HEDGE'?(reduceOnly?(side==='BUY'?'SHORT':'LONG'):(side==='BUY'?'LONG':'SHORT')):'BOTH';
    const payload:any={symbol:engineMarket.symbol,side,positionSide,orderType,marginMode,leverage,quantity:q,clientOrderId:`web-${crypto.randomUUID()}`,reduceOnly:orderType==='TRAILING_STOP'?true:reduceOnly,postOnly:orderType==='LIMIT'?postOnly:false,timeInForce:orderType==='LIMIT'?(postOnly?'POST_ONLY':timeInForce):'GTC',triggerBy};
    if(orderType==='LIMIT')payload.price=Number(price);
    if(orderType==='TRIGGER'){payload.triggerPrice=Number(triggerPrice);payload.triggerDirection=triggerDirection;payload.triggerOrderType=triggerOrderType;if(triggerOrderType==='LIMIT')payload.price=Number(price)}
    if(orderType==='TRAILING_STOP'){payload.callbackRate=Number(callbackRate)/100;if(activationPrice)payload.activationPrice=Number(activationPrice)}
    if(takeProfit)payload.takeProfit=Number(takeProfit);if(stopLoss)payload.stopLoss=Number(stopLoss);
    setBusy(true);try{const {data,error}=await supabase.rpc('futures_action',{p_action:'order',p_payload:payload});if(error)throw error;const o=data as Order;setMessage(o.status==='FILLED'?'주문이 체결되었습니다.':o.status==='REJECTED'?(o.rejection_reason||'주문이 거부되었습니다.'):'주문이 접수되었습니다.');await loadSnapshot()}catch(e:any){setMessage(String(e?.message||'주문 처리 중 오류가 발생했습니다.'))}finally{setBusy(false)}
  }

  async function callAction(action:string,payload:any,ok:string){setBusy(true);setMessage('');try{const {error}=await supabase.rpc('futures_action',{p_action:action,p_payload:payload});if(error)throw error;setMessage(ok);await loadSnapshot()}catch(e:any){setMessage(String(e?.message||'처리 중 오류가 발생했습니다.'))}finally{setBusy(false)}}
  const cancelOrder=(orderId:string)=>callAction('cancel',{orderId},'주문을 취소했습니다.');
  const cancelAll=()=>callAction('cancel_all',{},'미체결 주문을 모두 취소했습니다.');
  const changePositionMode=(mode:'ONE_WAY'|'HEDGE')=>mode===positionMode?Promise.resolve():callAction('position_mode',{mode},mode==='HEDGE'?'헤지 모드로 변경했습니다.':'단방향 모드로 변경했습니다.');
  async function editTPSL(p:Position){const tp=window.prompt('Take Profit 가격 (비우면 해제)',p.take_profit?String(p.take_profit):'');if(tp===null)return;const sl=window.prompt('Stop Loss 가격 (비우면 해제)',p.stop_loss?String(p.stop_loss):'');if(sl===null)return;await callAction('position_tpsl',{positionId:p.id,takeProfit:tp.trim()?Number(tp):null,stopLoss:sl.trim()?Number(sl):null,triggerBy:'MARK'},'TP/SL을 변경했습니다.')}
  async function addMargin(p:Position){const value=window.prompt('추가할 격리 증거금(USDT)','10');if(value===null)return;const amount=Number(value);if(!Number.isFinite(amount)||amount<=0){setMessage('추가 증거금을 확인하세요.');return}await callAction('position_margin',{positionId:p.id,amount,clientOrderId:`margin-${crypto.randomUUID()}`},'격리 증거금을 추가했습니다.')}
  async function changeLeverage(p:Position){const pm=marketsPayload.markets.find(x=>x.symbol===p.symbol);const value=window.prompt(`변경 레버리지 (1~${pm?.max_leverage||100})`,String(p.leverage));if(value===null)return;const next=Number(value);if(!Number.isInteger(next)||next<1||next>(pm?.max_leverage||100)){setMessage('허용 레버리지를 확인하세요.');return}await callAction('position_leverage',{positionId:p.id,leverage:next},'포지션 레버리지를 변경했습니다.')}
  async function closePosition(p:Position,ratio:number){const pm=marketsPayload.markets.find(x=>x.symbol===p.symbol);if(!pm){setMessage('종목 정보를 찾을 수 없습니다.');return}const scale=Math.pow(10,pm.quantity_precision);const q=ratio>=1?num(p.size):Math.floor(num(p.size)*ratio*scale)/scale;if(q<=0){setMessage('청산 가능한 수량이 없습니다.');return}await callAction('order',{symbol:p.symbol,side:p.side==='LONG'?'SELL':'BUY',positionSide:positionMode==='HEDGE'?p.position_side:'BOTH',orderType:'MARKET',marginMode:p.margin_mode,leverage:p.leverage,quantity:q,clientOrderId:`close-${crypto.randomUUID()}`,reduceOnly:true,postOnly:false,timeInForce:'GTC',triggerBy:'MARK'},`${Math.round(ratio*100)}% 청산 주문을 전송했습니다.`)}

  return <main className={s.page}>
    {message&&<div className={s.toast} onClick={()=>setMessage('')}>{message}</div>}
    <section className={s.marketHeader}>
      <div className={s.symbolCell}><FuturesMarketSelector markets={feedMarkets} selectedSymbol={currentSymbol} onSelect={setSymbol}/></div>
      <div className={s.priceCell}><strong className={changePct>=0?s.up:s.down}>{priceFmt(lastPrice,priceDigits)}</strong><span>{changePct>=0?'+':''}{changePct.toFixed(2)}%</span></div>
      <div className={s.metric}><span>Mark Price</span><b>{priceFmt(markPrice,priceDigits)}</b></div><div className={s.metric}><span>Index Price</span><b>{priceFmt(indexPrice,priceDigits)}</b></div>
      <div className={s.metric}><span>24H High</span><b>{priceFmt(high24h,priceDigits)}</b></div><div className={s.metric}><span>24H Low</span><b>{priceFmt(low24h,priceDigits)}</b></div>
      <div className={s.metric}><span>24H Volume</span><b>{compact(quoteVolume)} USDT</b></div><div className={s.metric}><span>Funding / Next</span><b className={fundingRate>=0?s.up:s.down}>{pct(fundingRate,4)} · {fundingText}</b></div>
    </section>

    {!settingsEnabled&&<div className={s.systemBanner}>선물거래 엔진은 연결되어 있으나 현재 신규 진입은 비활성화 상태입니다. 시세·차트·호가 조회는 정상 동작합니다.</div>}
    {settingsEnabled&&!engineMarket&&<div className={s.systemBanner}>선택한 종목은 Binance USDT-M 실시간 시세/차트 포워딩이 가능하지만 BITMATE 주문 엔진에는 아직 등록되지 않았습니다.</div>}

    <section className={s.terminal}>
      <section className={`${s.panel} ${s.chartPanel}`}><div className={s.panelHead}><div><button className={s.activeTab}>차트</button><button>정보</button></div><span className={s.live}><i/> LIVE · Binance USDT-M</span></div><div className={s.chartStage} data-symbol={currentSymbol}/></section>
      <section className={s.panel}><div className={s.panelHead}><div><button className={bookTab==='book'?s.activeTab:''} onClick={()=>setBookTab('book')}>호가</button><button className={bookTab==='recent'?s.activeTab:''} onClick={()=>setBookTab('recent')}>최근 체결</button></div></div><BinanceMarketDepth symbol={currentSymbol} currentPrice={lastPrice} mode={bookTab} marketType="futures" classNames={{bookBody:s.bookBody,bookHead:s.bookHead,bookRows:s.bookRows,bookRow:s.bookRow,askDepth:s.askDepth,bidDepth:s.bidDepth,midPrice:s.midPrice,bookStatus:s.bookStatus,recentList:s.recentList,empty:s.empty}}/></section>

      <section className={`${s.panel} ${s.orderPanel}`}>
        <div className={s.sideSelector}><button className={tradeSide==='BUY'?s.longSelected:''} onClick={()=>setTradeSide('BUY')}>Long</button><button className={tradeSide==='SELL'?s.shortSelected:''} onClick={()=>setTradeSide('SELL')}>Short</button></div>
        <div className={s.orderTabs}><button className={orderType==='LIMIT'?s.activeTab:''} onClick={()=>setOrderType('LIMIT')}>Limit</button><button className={orderType==='MARKET'?s.activeTab:''} onClick={()=>setOrderType('MARKET')}>Market</button><button className={orderType==='TRIGGER'?s.activeTab:''} onClick={()=>setOrderType('TRIGGER')}>Trigger</button><button className={orderType==='TRAILING_STOP'?s.activeTab:''} onClick={()=>setOrderType('TRAILING_STOP')}>Trailing</button></div>
        <div className={s.compactSettings}><div className={s.modeBar}><span>Position</span><div><button disabled={!loggedIn||busy} className={positionMode==='ONE_WAY'?s.selectedPill:''} onClick={()=>changePositionMode('ONE_WAY')}>One-Way</button><button disabled={!loggedIn||busy} className={positionMode==='HEDGE'?s.selectedPill:''} onClick={()=>changePositionMode('HEDGE')}>Hedge</button></div></div><div className={s.orderTop}><button className={marginMode==='CROSS'?s.selectedPill:''} onClick={()=>setMarginMode('CROSS')}>Cross</button><button className={marginMode==='ISOLATED'?s.selectedPill:''} onClick={()=>setMarginMode('ISOLATED')}>Isolated</button><label><input type="number" min={1} max={engineMarket?.max_leverage||100} value={leverage} onChange={e=>setLeverage(Math.max(1,Math.min(engineMarket?.max_leverage||100,Number(e.target.value)||1)))}/><span>x</span></label></div></div>
        <div className={s.available}><span>Available</span><b>{loggedIn?`${priceFmt(snapshot?.account?.available_balance,2)} USDT`:'로그인 필요'}</b></div>

        {orderType==='MARKET'&&<div className={s.inputRow}><span>Price</span><b className={s.readonlyValue}>Market</b><em>USDT</em></div>}
        {orderType==='LIMIT'&&<><label className={s.inputRow}><span>Price</span><input value={price} onChange={e=>setPrice(e.target.value)} inputMode="decimal"/><em>USDT</em></label><div className={s.microControls}><span>Time in Force</span>{(['GTC','IOC','FOK'] as TimeInForce[]).map(x=><button key={x} className={timeInForce===x?s.selectedPill:''} onClick={()=>setTimeInForce(x)}>{x}</button>)}</div></>}
        {orderType==='TRIGGER'&&<><label className={s.inputRow}><span>Trigger Price</span><input value={triggerPrice} onChange={e=>setTriggerPrice(e.target.value)} inputMode="decimal"/><em>USDT</em></label><div className={s.microControls}><span>Trigger By</span><button className={triggerBy==='MARK'?s.selectedPill:''} onClick={()=>setTriggerBy('MARK')}>Mark</button><button className={triggerBy==='LAST'?s.selectedPill:''} onClick={()=>setTriggerBy('LAST')}>Last</button></div><div className={s.triggerDir}><button className={triggerDirection==='ABOVE'?s.selectedPill:''} onClick={()=>setTriggerDirection('ABOVE')}>이상 도달</button><button className={triggerDirection==='BELOW'?s.selectedPill:''} onClick={()=>setTriggerDirection('BELOW')}>이하 도달</button></div><div className={s.microControls}><span>Execution</span><button className={triggerOrderType==='MARKET'?s.selectedPill:''} onClick={()=>setTriggerOrderType('MARKET')}>Market</button><button className={triggerOrderType==='LIMIT'?s.selectedPill:''} onClick={()=>setTriggerOrderType('LIMIT')}>Limit</button></div>{triggerOrderType==='LIMIT'&&<label className={s.inputRow}><span>Order Price</span><input value={price} onChange={e=>setPrice(e.target.value)} inputMode="decimal"/><em>USDT</em></label>}</>}
        {orderType==='TRAILING_STOP'&&<><label className={s.inputRow}><span>Activation Price</span><input value={activationPrice} onChange={e=>setActivationPrice(e.target.value)} inputMode="decimal" placeholder="선택"/><em>USDT</em></label><label className={s.inputRow}><span>Callback Rate</span><input value={callbackRate} onChange={e=>setCallbackRate(e.target.value)} inputMode="decimal"/><em>%</em></label></>}

        <label className={s.inputRow}><span>Margin</span><input value={orderValue} onChange={e=>setOrderValue(e.target.value)} inputMode="decimal"/><em>USDT</em></label>
        <div className={s.ratios}>{[.25,.5,.75,1].map(r=><button key={r} onClick={()=>setRatio(r)}>{Math.round(r*100)}%</button>)}</div>
        <div className={s.inputRow}><span>Position Value</span><b className={s.readonlyValue}>{priceFmt(positionValue,2)}</b><em>USDT</em></div>
        <div className={s.tpsl}><label><span>Take Profit</span><input value={takeProfit} onChange={e=>setTakeProfit(e.target.value)} inputMode="decimal" placeholder="선택"/></label><label><span>Stop Loss</span><input value={stopLoss} onChange={e=>setStopLoss(e.target.value)} inputMode="decimal" placeholder="선택"/></label></div>
        <div className={s.options}><label><input type="checkbox" checked={reduceOnly} onChange={e=>setReduceOnly(e.target.checked)}/> Reduce Only</label><label><input type="checkbox" checked={postOnly} disabled={orderType!=='LIMIT'} onChange={e=>setPostOnly(e.target.checked)}/> Post Only</label></div>

        <div className={s.orderFooter}>
          <div className={s.preview}><div><span>Margin</span><b>{priceFmt(marginAmount,2)} USDT</b></div><div><span>Position Value</span><b>{priceFmt(positionValue,2)} USDT</b></div><div><span>Estimated Fee</span><b>{priceFmt(preview?.estimated_fee,4)} USDT</b></div><div><span>Est. Qty</span><b>{priceFmt(quantity,qtyDigits)} {baseAsset}</b></div></div>
          <div className={s.tradeButtons}><button disabled={busy||!canTrade} className={tradeSide==='BUY'?s.longBtn:s.shortBtn} style={{gridColumn:'1 / -1'}} onClick={()=>submit(tradeSide)}>{tradeSide==='BUY'?`Long ${baseAsset}`:`Short ${baseAsset}`}</button></div>
          <p className={s.orderNote}>{engineMarket?'25%/50%/75%/100%는 현재 사용 가능 자산에서 해당 비율만큼 증거금을 배정합니다. 레버리지는 그 증거금으로 만들 포지션 가치에만 적용됩니다.':'현재 이 종목은 주문할 수 없습니다. 다른 거래 가능 종목을 선택하세요.'}</p>
        </div>
      </section>
    </section>

    <section className={s.accountStrip}><div><span>Wallet Balance</span><b>{loggedIn?priceFmt(snapshot?.account?.balance,2):'—'}</b></div><div><span>Available</span><b>{loggedIn?priceFmt(snapshot?.account?.available_balance,2):'—'}</b></div><div><span>Used Margin</span><b>{loggedIn?priceFmt(snapshot?.account?.used_margin,2):'—'}</b></div><div><span>Unrealized PNL</span><b className={num(snapshot?.account?.unrealized_pnl)>=0?s.up:s.down}>{loggedIn?priceFmt(snapshot?.account?.unrealized_pnl,2):'—'}</b></div><div><span>Realized PNL</span><b className={num(snapshot?.account?.realized_pnl)>=0?s.up:s.down}>{loggedIn?priceFmt(snapshot?.account?.realized_pnl,2):'—'}</b></div></section>

    <section className={`${s.panel} ${s.bottomPanel}`}><div className={s.bottomTabs}><button className={bottomTab==='positions'?s.activeTab:''} onClick={()=>setBottomTab('positions')}>포지션 ({positions.length})</button><button className={bottomTab==='open'?s.activeTab:''} onClick={()=>setBottomTab('open')}>미체결 주문 ({activeOrders.length})</button><button className={bottomTab==='orders'?s.activeTab:''} onClick={()=>setBottomTab('orders')}>주문내역</button><button className={bottomTab==='fills'?s.activeTab:''} onClick={()=>setBottomTab('fills')}>체결내역</button><button className={bottomTab==='funding'?s.activeTab:''} onClick={()=>setBottomTab('funding')}>Funding</button>{bottomTab==='open'&&activeOrders.length>0&&<button className={s.cancelAll} disabled={busy} onClick={cancelAll}>전체 취소</button>}</div>
      <div className={s.tableWrap}>
        {bottomTab==='positions'&&<table><thead><tr><th>Symbol</th><th>Side</th><th>Size</th><th>Entry</th><th>Mark</th><th>Liq. Price</th><th>Margin</th><th>PNL</th><th>ROE</th><th>TP / SL</th><th>Actions</th></tr></thead><tbody>{positions.length?positions.map(p=><tr key={p.id}><td><b>{p.symbol}</b></td><td className={p.side==='LONG'?s.up:s.down}>{p.side} · {p.leverage}x · {p.margin_mode}</td><td>{priceFmt(p.size,marketsPayload.markets.find(m=>m.symbol===p.symbol)?.quantity_precision||3)}</td><td>{priceFmt(p.entry_price,2)}</td><td>{priceFmt(p.mark_price,2)}</td><td>{priceFmt(p.liquidation_price,2)}</td><td>{priceFmt(p.margin,2)}</td><td className={num(p.unrealized_pnl)>=0?s.up:s.down}>{priceFmt(p.unrealized_pnl,2)}</td><td className={num(p.roe)>=0?s.up:s.down}>{num(p.roe).toFixed(2)}%</td><td>{p.take_profit?priceFmt(p.take_profit,2):'—'} / {p.stop_loss?priceFmt(p.stop_loss,2):'—'}</td><td><div className={s.positionActions}><button disabled={busy} onClick={()=>editTPSL(p)}>TP/SL</button>{p.margin_mode==='ISOLATED'&&<button disabled={busy} onClick={()=>addMargin(p)}>+Margin</button>}<button disabled={busy} onClick={()=>changeLeverage(p)}>Lev</button>{[.25,.5,.75].map(r=><button key={r} disabled={busy} onClick={()=>closePosition(p,r)}>{r*100}%</button>)}<button className={s.closeAll} disabled={busy} onClick={()=>closePosition(p,1)}>Close</button></div></td></tr>):<EmptyRow cols={11} loggedIn={loggedIn}/>}</tbody></table>}
        {bottomTab==='open'&&<table><thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Type</th><th>Price</th><th>Qty</th><th>Filled</th><th>Status</th><th/></tr></thead><tbody>{activeOrders.length?activeOrders.map(o=><tr key={o.id}><td>{dateTime(o.created_at)}</td><td><b>{o.symbol}</b></td><td className={o.side==='BUY'?s.up:s.down}>{o.side}</td><td>{o.order_type}</td><td>{priceFmt(o.price??o.trigger_price,2)}</td><td>{priceFmt(o.quantity,4)}</td><td>{priceFmt(o.filled_quantity,4)}</td><td>{o.status}</td><td><button className={s.cancelBtn} onClick={()=>cancelOrder(o.id)}>취소</button></td></tr>):<EmptyRow cols={9} loggedIn={loggedIn}/>}</tbody></table>}
        {bottomTab==='orders'&&<table><thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Type</th><th>Requested</th><th>Avg Fill</th><th>Qty</th><th>Fee</th><th>Status</th></tr></thead><tbody>{snapshot?.orders?.length?snapshot.orders.map(o=><tr key={o.id}><td>{dateTime(o.created_at)}</td><td>{o.symbol}</td><td className={o.side==='BUY'?s.up:s.down}>{o.side}</td><td>{o.order_type}</td><td>{priceFmt(o.price??o.trigger_price,2)}</td><td>{priceFmt(o.average_fill_price,2)}</td><td>{priceFmt(o.quantity,4)}</td><td>{priceFmt(o.fee,4)}</td><td title={o.rejection_reason||''}>{o.status}</td></tr>):<EmptyRow cols={9} loggedIn={loggedIn}/>}</tbody></table>}
        {bottomTab==='fills'&&<table><thead><tr><th>Time</th><th>Price</th><th>Quantity</th><th>Role</th><th>Fee</th><th>Realized PNL</th></tr></thead><tbody>{snapshot?.fills?.length?snapshot.fills.map(f=><tr key={f.id}><td>{dateTime(f.created_at)}</td><td>{priceFmt(f.price,2)}</td><td>{priceFmt(f.quantity,4)}</td><td>{f.liquidity_role}</td><td>{priceFmt(f.fee,4)}</td><td className={num(f.realized_pnl)>=0?s.up:s.down}>{priceFmt(f.realized_pnl,2)}</td></tr>):<EmptyRow cols={6} loggedIn={loggedIn}/>}</tbody></table>}
        {bottomTab==='funding'&&<table><thead><tr><th>Time</th><th>Symbol</th><th>Rate</th><th>Notional</th><th>Amount</th></tr></thead><tbody>{snapshot?.funding?.length?snapshot.funding.map(f=><tr key={f.id}><td>{dateTime(f.funding_time)}</td><td>{f.symbol}</td><td>{pct(f.rate,4)}</td><td>{priceFmt(f.notional,2)}</td><td className={num(f.amount)>=0?s.up:s.down}>{priceFmt(f.amount,4)}</td></tr>):<EmptyRow cols={5} loggedIn={loggedIn}/>}</tbody></table>}
      </div>
    </section>
  </main>;
}

function EmptyRow({cols,loggedIn}:{cols:number;loggedIn:boolean}){return <tr><td colSpan={cols} className={s.empty}>{loggedIn?'표시할 내역이 없습니다.':'로그인하면 선물 계정과 거래 내역을 확인할 수 있습니다.'}</td></tr>}
