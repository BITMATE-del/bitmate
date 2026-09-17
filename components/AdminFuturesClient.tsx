'use client';

import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import s from './AdminFutures.module.css';

type SymbolRow={symbol:string;display_name:string;base_asset:string;quote_asset:string;enabled:boolean;trading_status:string;min_order_size:number;max_order_size:number;min_notional:number;max_notional:number;max_position_size:number;quantity_precision:number;price_precision:number;max_leverage:number;maker_fee:number;taker_fee:number;maintenance_margin_rate:number;liquidation_fee:number;funding_enabled:boolean;funding_interval_hours:number;funding_source:string;fixed_funding_rate:number};
type Snapshot={settings:any;symbols:SymbolRow[];health:any;accounts:any[];positions:any[];audit:any[]};

const n=(v:any)=>Number(v||0);
const f=(v:any,d=4)=>Number(v||0).toLocaleString(undefined,{maximumFractionDigits:d});

export default function AdminFuturesClient(){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [admin,setAdmin]=useState<boolean|null>(null);
  const [data,setData]=useState<Snapshot>({settings:null,symbols:[],health:null,accounts:[],positions:[],audit:[]});
  const [selected,setSelected]=useState<SymbolRow|null>(null);
  const [form,setForm]=useState<Partial<SymbolRow>>({});
  const [reason,setReason]=useState('');
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);
  const [adjustUser,setAdjustUser]=useState('');
  const [adjustAmount,setAdjustAmount]=useState('');
  const [adjustDirection,setAdjustDirection]=useState<'CREDIT'|'DEBIT'>('CREDIT');
  const [adjustRef,setAdjustRef]=useState('');

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    const ok=user?.app_metadata?.role==='admin';setAdmin(ok);
    if(!ok)return;
    const {data:d,error}=await supabase.rpc('futures_action',{p_action:'admin_snapshot',p_payload:{}});
    if(error){setMsg(error.message);return;}
    const snap=d as Snapshot;setData(snap);
    setSelected(prev=>prev?(snap.symbols||[]).find(x=>x.symbol===prev.symbol)||snap.symbols?.[0]||null:snap.symbols?.[0]||null);
  }

  useEffect(()=>{load();const id=setInterval(load,5000);return()=>clearInterval(id)},[]);
  useEffect(()=>{if(selected)setForm({...selected})},[selected?.symbol,data.symbols]);

  async function run(action:string,payload:any,success:string){
    if(reason.trim().length<5){setMsg('변경 사유를 5자 이상 입력하세요.');return false}
    setBusy(true);setMsg('');
    const {error}=await supabase.rpc('futures_action',{p_action:action,p_payload:{...payload,reason:reason.trim()}});
    setBusy(false);
    if(error){setMsg(error.message);return false}
    setMsg(success);await load();return true;
  }

  async function toggleGlobal(){
    await run('admin_settings',{enabled:!data.settings?.enabled},data.settings?.enabled?'신규 선물거래를 중지했습니다.':'신규 선물거래를 활성화했습니다.');
  }

  async function saveSymbol(){
    if(!selected)return;
    const payload:any={symbol:selected.symbol};
    const keys:(keyof SymbolRow)[]=['enabled','trading_status','max_leverage','min_order_size','max_order_size','min_notional','max_notional','max_position_size','maker_fee','taker_fee','maintenance_margin_rate','liquidation_fee','funding_enabled','funding_interval_hours','funding_source','fixed_funding_rate'];
    for(const k of keys){const v=(form as any)[k];if(v!==undefined&&v!=='')payload[k]=v}
    await run('admin_symbol',payload,`${selected.symbol} 설정을 저장했습니다.`);
  }

  async function adjustBalance(){
    if(!adjustUser||!adjustAmount||!adjustRef){setMsg('사용자 ID, 금액, 고유 참조번호를 입력하세요.');return}
    const ok=await run('admin_adjust_balance',{userId:adjustUser,direction:adjustDirection,amount:Number(adjustAmount),reference:adjustRef},'선물 지갑 관리자 정산이 처리되었습니다.');
    if(ok){setAdjustAmount('');setAdjustRef('')}
  }

  async function forceClose(positionId:string){
    await run('admin_close',{positionId},'포지션을 관리자 강제 종료했습니다.');
  }

  if(admin===null)return <main className={s.page}><div className={s.shell}>관리자 권한 확인 중...</div></main>;
  if(!admin)return <main className={s.page}><div className={s.shell}>관리자 권한이 필요합니다.</div></main>;

  const healthFresh=data.health?.risk_at&&Date.now()-new Date(data.health.risk_at).getTime()<30000;
  return <main className={s.page}><div className={s.shell}>
    <section className={s.hero}><div><span className={s.eyebrow}>ADMIN · FUTURES</span><h1>Futures Management</h1><p>USDT-M 선물 엔진, 종목 위험값, 수수료, Funding, 계정 및 열린 포지션을 관리합니다.</p></div><div className={s.status}><span className={`${s.pill} ${data.settings?.enabled?s.ok:s.warn}`}>Trading {data.settings?.enabled?'ON':'OFF'}</span><span className={`${s.pill} ${healthFresh?s.ok:s.bad}`}>Engine {healthFresh?'HEALTHY':'CHECK'}</span><span className={s.pill}>{data.symbols?.length||0} Symbols</span></div></section>
    {msg&&<div className={s.message}>{msg}</div>}

    <section className={s.metrics}>
      <div className={s.metric}><span>Price Worker</span><b>{data.health?.prices_at?new Date(data.health.prices_at).toLocaleTimeString('ko-KR',{hour12:false}):'—'}</b></div>
      <div className={s.metric}><span>Risk Worker</span><b>{data.health?.risk_at?new Date(data.health.risk_at).toLocaleTimeString('ko-KR',{hour12:false}):'—'}</b></div>
      <div className={s.metric}><span>Funding Worker</span><b>{data.health?.funding_at?new Date(data.health.funding_at).toLocaleTimeString('ko-KR',{hour12:false}):'—'}</b></div>
      <div className={s.metric}><span>Last Error</span><b className={data.health?.last_error?s.bad:s.ok}>{data.health?.last_error||'NONE'}</b></div>
    </section>

    <section className={s.grid}>
      <div>
        <div className={s.panel}>
          <div className={s.panelHead}><b>Global Trading</b><span>{data.settings?.enabled?'신규 진입 허용':'신규 진입 중지'}</span></div>
          <div className={s.body}><label className={s.field}>변경 사유<textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="최소 5자 이상 입력"/></label><div className={s.actions}><button className={data.settings?.enabled?s.danger:s.primary} disabled={busy} onClick={toggleGlobal}>{data.settings?.enabled?'신규 거래 중지':'신규 거래 활성화'}</button><button className={s.ghost} disabled={busy} onClick={load}>새로고침</button></div></div>
        </div>

        <div className={`${s.panel} ${s.section}`}>
          <div className={s.panelHead}><b>Symbols</b><span>{data.symbols?.length||0}</span></div>
          <div className={s.symbolList}>{(data.symbols||[]).map(x=><div key={x.symbol} className={`${s.symbolItem} ${selected?.symbol===x.symbol?s.selected:''}`} onClick={()=>setSelected(x)}><span><b>{x.display_name} · {x.symbol}</b><small>{x.trading_status} · max {x.max_leverage}x · maker {(n(x.maker_fee)*100).toFixed(3)}% · taker {(n(x.taker_fee)*100).toFixed(3)}%</small></span><em className={x.enabled?s.ok:s.bad}>{x.enabled?'ON':'OFF'}</em></div>)}</div>
        </div>
      </div>

      <div>
        <div className={s.panel}>
          <div className={s.panelHead}><b>{selected?`${selected.symbol} Risk / Fee Settings`:'종목 선택'}</b><span>서버 검증값</span></div>
          <div className={s.body}>{selected&&<>
            <div className={s.row2}><label className={s.field}>Enabled<select value={String(form.enabled??true)} onChange={e=>setForm(v=>({...v,enabled:e.target.value==='true'}))}><option value="true">ON</option><option value="false">OFF</option></select></label><label className={s.field}>Trading Status<select value={String(form.trading_status||'ACTIVE')} onChange={e=>setForm(v=>({...v,trading_status:e.target.value}))}><option>ACTIVE</option><option>CLOSE_ONLY</option><option>PAUSED</option></select></label></div>
            <div className={s.row2}><label className={s.field}>Max Leverage<input type="number" value={form.max_leverage??''} onChange={e=>setForm(v=>({...v,max_leverage:Number(e.target.value)}))}/></label><label className={s.field}>Max Position Size<input value={form.max_position_size??''} onChange={e=>setForm(v=>({...v,max_position_size:Number(e.target.value)}))}/></label></div>
            <div className={s.row2}><label className={s.field}>Min Order Size<input value={form.min_order_size??''} onChange={e=>setForm(v=>({...v,min_order_size:Number(e.target.value)}))}/></label><label className={s.field}>Max Order Size<input value={form.max_order_size??''} onChange={e=>setForm(v=>({...v,max_order_size:Number(e.target.value)}))}/></label></div>
            <div className={s.row2}><label className={s.field}>Min Notional (USDT)<input value={form.min_notional??''} onChange={e=>setForm(v=>({...v,min_notional:Number(e.target.value)}))}/></label><label className={s.field}>Max Notional (USDT)<input value={form.max_notional??''} onChange={e=>setForm(v=>({...v,max_notional:Number(e.target.value)}))}/></label></div>
            <div className={s.row2}><label className={s.field}>Maker Fee<input value={form.maker_fee??''} onChange={e=>setForm(v=>({...v,maker_fee:Number(e.target.value)}))}/></label><label className={s.field}>Taker Fee<input value={form.taker_fee??''} onChange={e=>setForm(v=>({...v,taker_fee:Number(e.target.value)}))}/></label></div>
            <div className={s.row2}><label className={s.field}>Maintenance Margin Rate<input value={form.maintenance_margin_rate??''} onChange={e=>setForm(v=>({...v,maintenance_margin_rate:Number(e.target.value)}))}/></label><label className={s.field}>Liquidation Fee<input value={form.liquidation_fee??''} onChange={e=>setForm(v=>({...v,liquidation_fee:Number(e.target.value)}))}/></label></div>
            <div className={s.row2}><label className={s.field}>Funding Enabled<select value={String(form.funding_enabled??true)} onChange={e=>setForm(v=>({...v,funding_enabled:e.target.value==='true'}))}><option value="true">ON</option><option value="false">OFF</option></select></label><label className={s.field}>Funding Interval Hours<input type="number" value={form.funding_interval_hours??''} onChange={e=>setForm(v=>({...v,funding_interval_hours:Number(e.target.value)}))}/></label></div>
            <div className={s.row2}><label className={s.field}>Funding Source<select value={String(form.funding_source||'EXCHANGE')} onChange={e=>setForm(v=>({...v,funding_source:e.target.value}))}><option>EXCHANGE</option><option>FIXED</option></select></label><label className={s.field}>Fixed Funding Rate<input value={form.fixed_funding_rate??''} onChange={e=>setForm(v=>({...v,fixed_funding_rate:Number(e.target.value)}))}/></label></div>
            <div className={s.actions}><button className={s.primary} disabled={busy} onClick={saveSymbol}>종목 설정 저장</button></div>
          </>}</div>
        </div>

        <div className={`${s.panel} ${s.section}`}>
          <div className={s.panelHead}><b>Admin Wallet Settlement</b><span>모든 변경은 Ledger/Audit 기록</span></div>
          <div className={s.body}><div className={s.row2}><label className={s.field}>User UUID<input value={adjustUser} onChange={e=>setAdjustUser(e.target.value)} placeholder="사용자 UUID"/></label><label className={s.field}>Direction<select value={adjustDirection} onChange={e=>setAdjustDirection(e.target.value as any)}><option>CREDIT</option><option>DEBIT</option></select></label></div><div className={s.row2}><label className={s.field}>Amount<input value={adjustAmount} onChange={e=>setAdjustAmount(e.target.value)} inputMode="decimal"/></label><label className={s.field}>Unique Reference<input value={adjustRef} onChange={e=>setAdjustRef(e.target.value)} placeholder="8자 이상 고유 참조"/></label></div><button className={s.ghost} disabled={busy} onClick={adjustBalance}>정산 처리</button></div>
        </div>
      </div>
    </section>

    <section className={`${s.panel} ${s.section}`}><div className={s.panelHead}><b>Open Positions</b><span>{data.positions?.length||0}</span></div><div className={s.tableWrap}><table className={s.table}><thead><tr><th>User</th><th>Symbol</th><th>Side</th><th>Size</th><th>Lev</th><th>Mode</th><th>Entry</th><th>Mark</th><th>Liq</th><th>PNL</th><th>ROE</th><th/></tr></thead><tbody>{data.positions?.length?data.positions.map((p:any)=><tr key={p.id}><td>{String(p.user_id).slice(0,8)}…</td><td>{p.symbol}</td><td className={p.side==='LONG'?s.ok:s.bad}>{p.side}</td><td>{f(p.size,6)}</td><td>{p.leverage}x</td><td>{p.margin_mode}</td><td>{f(p.entry_price,6)}</td><td>{f(p.mark_price,6)}</td><td>{p.liquidation_price?f(p.liquidation_price,6):'—'}</td><td className={n(p.unrealized_pnl)>=0?s.ok:s.bad}>{f(p.unrealized_pnl,2)}</td><td>{f(p.roe,2)}%</td><td><button className={s.danger} disabled={busy} onClick={()=>forceClose(p.id)}>강제 종료</button></td></tr>):<tr><td colSpan={12} className={s.empty}>열린 포지션이 없습니다.</td></tr>}</tbody></table></div></section>

    <section className={`${s.panel} ${s.section}`}><div className={s.panelHead}><b>Futures Accounts</b><span>{data.accounts?.length||0}</span></div><div className={s.tableWrap}><table className={s.table}><thead><tr><th>User</th><th>Balance</th><th>Realized PNL</th><th>Fees</th><th>Funding</th><th>Position Mode</th><th>Status</th></tr></thead><tbody>{data.accounts?.length?data.accounts.map((a:any)=><tr key={a.id}><td>{String(a.user_id).slice(0,12)}…</td><td>{f(a.balance,2)}</td><td className={n(a.realized_pnl)>=0?s.ok:s.bad}>{f(a.realized_pnl,2)}</td><td>{f(a.trading_fees,4)}</td><td>{f(a.funding,4)}</td><td>{a.position_mode}</td><td>{a.status}</td></tr>):<tr><td colSpan={7} className={s.empty}>선물 계정이 없습니다.</td></tr>}</tbody></table></div></section>

    <section className={`${s.panel} ${s.section}`}><div className={s.panelHead}><b>Audit Log</b><span>{data.audit?.length||0}</span></div><div className={s.tableWrap}><table className={s.table}><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Reason</th></tr></thead><tbody>{data.audit?.length?data.audit.map((x:any)=><tr key={x.id}><td>{new Date(x.created_at).toLocaleString('ko-KR',{hour12:false})}</td><td>{String(x.actor_id).slice(0,8)}…</td><td>{x.action}</td><td>{x.target_id}</td><td>{x.reason}</td></tr>):<tr><td colSpan={5} className={s.empty}>감사 로그가 없습니다.</td></tr>}</tbody></table></div></section>
  </div></main>;
}
