'use client';

import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon,{type UiIconName} from './UiIcon';
import s from './HeaderUserTools.module.css';

type Panel='currency'|'wallet'|'account'|'notifications'|'download'|null;
type DisplayCurrency='KRW'|'USDT';
type Balance={asset:string;available:number;locked:number};
type WalletSnapshot={spot:Balance[];futures_usdt:number};

const walletItems:[UiIconName,string,string][]=[
  ['overview','Overview','/account?view=overview'],
  ['spot','Spot Account','/account?view=spot'],
  ['margin','Margin Account','/account?view=margin'],
  ['futures','Futures Account','/account?view=futures'],
  ['earn','Earn Account','/account?view=earn'],
  ['copy','Copy trading','/account?view=copy'],
  ['strategy','Strategy Account','/account?view=strategy'],
  ['insurance','Insurance Account','/account?view=insurance'],
  ['verification','Verification','/account?view=verification'],
  ['order','Order','/account?view=order'],
];
const memberItems:[UiIconName,string,string][]=[
  ['overview','Overview','/member?view=overview'],
  ['verification','Identity Verification','/member?view=verification'],
  ['security','Security Center','/member?view=security'],
  ['api','API Management','/member?view=api'],
  ['settings','Setting','/member?view=setting'],
  ['referral','Referral Rewards','/member?view=referral'],
  ['voucher','My Vouchers','/member?view=vouchers'],
  ['subaccount','Sub-account','/member?view=subaccount'],
];

const notificationItems:[UiIconName,string,string,string,string][]=[
  ['notification','System Notification','1','New Task Unlocked','2026-09-17 15:45:11'],
  ['listing','New Listings','','No updates at the moment',''],
  ['campaign','Hot Campaigns','','No updates at the moment',''],
  ['bell','Important Notices','','No updates at the moment',''],
  ['copy','Copy Trading Notification','','No updates at the moment',''],
  ['bot','Bot Notification','','No updates at the moment',''],
  ['wallet','Smart Money Notification','','No updates at the moment',''],
  ['priceAlert','Price Alerts','','No updates at the moment',''],
];

function maskEmail(email:string){const [name,domain='']=email.split('@');if(!domain)return email;return `${name.slice(0,2)}***@${domain}`}
function formatUsdt(value:number){return Number(value||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}

export default function HeaderUserTools(){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [panel,setPanel]=useState<Panel>(null);
  const [displayCurrency,setDisplayCurrency]=useState<DisplayCurrency>('KRW');
  const [krwRate,setKrwRate]=useState(0);
  const [email,setEmail]=useState('');
  const [uid,setUid]=useState('');
  const [wallet,setWallet]=useState<WalletSnapshot>({spot:[],futures_usdt:0});
  const [walletLoading,setWalletLoading]=useState(false);
  const root=useRef<HTMLDivElement>(null);

  useEffect(()=>{supabase.auth.getUser().then(({data:{user}})=>{if(user){setEmail(user.email||'');setUid(user.id||'')}})},[supabase]);
  useEffect(()=>{
    const saved=localStorage.getItem('bitmate_display_currency');
    if(saved==='KRW'||saved==='USDT')setDisplayCurrency(saved);
    fetch('/api/fx/usdt-krw',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(v=>{const rate=Number(v?.rate||0);if(rate>0)setKrwRate(rate)}).catch(()=>{});
  },[]);
  const chooseCurrency=(next:DisplayCurrency)=>{
    setDisplayCurrency(next);
    localStorage.setItem('bitmate_display_currency',next);
    window.dispatchEvent(new CustomEvent('bitmate:display-currency',{detail:{currency:next}}));
    setPanel(null);
  };
  useEffect(()=>{const close=(e:MouseEvent)=>{if(root.current&&!root.current.contains(e.target as Node))setPanel(null)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[]);
  useEffect(()=>{
    if(panel!=='wallet'||!uid)return;
    let alive=true;
    setWalletLoading(true);
    supabase.rpc('user_wallet_snapshot').then(({data,error})=>{
      if(!alive)return;
      setWalletLoading(false);
      if(!error&&data){
        const snap=data as WalletSnapshot;
        setWallet({
          spot:Array.isArray(snap.spot)?snap.spot:[],
          futures_usdt:Number(snap.futures_usdt||0),
        });
      }
    });
    return()=>{alive=false};
  },[panel,uid,supabase]);

  const toggle=(next:Panel)=>setPanel(v=>v===next?null:next);
  const logout=async()=>{await supabase.auth.signOut();location.href='/'};
  const usdt=wallet.spot.find(x=>x.asset==='USDT');
  const spotAvailable=Number(usdt?.available||0);
  const spotLocked=Number(usdt?.locked||0);
  const futuresBalance=Number(wallet.futures_usdt||0);
  const headerBalance=spotAvailable;
  const displayBalance=displayCurrency==='KRW'&&krwRate>0?headerBalance*krwRate:headerBalance;

  return <div className={s.root} ref={root}>
    <div className={s.rel}>
      <button className={s.currencyButton} onClick={()=>toggle('currency')} aria-label="Display currency">{displayCurrency}<UiIcon name="chevronDown" size={12}/></button>
      {panel==='currency'&&<div className={s.currencyMenu}>
        <button className={displayCurrency==='KRW'?s.currencyActive:''} onClick={()=>chooseCurrency('KRW')}><b>KRW</b><span>원화 기준</span></button>
        <button className={displayCurrency==='USDT'?s.currencyActive:''} onClick={()=>chooseCurrency('USDT')}><b>USDT</b><span>테더 기준</span></button>
      </div>}
    </div>
    <Link className={s.deposit} href="/deposit">Deposit</Link>

    <div className={s.rel} onMouseEnter={()=>setPanel('wallet')} onMouseLeave={()=>setPanel(v=>v==='wallet'?null:v)}>
      <button className={`${s.icon} ${panel==='wallet'?s.active:''}`} onClick={()=>toggle('wallet')} aria-label="Wallet"><UiIcon name="wallet" size={18}/></button>
      {panel==='wallet'&&<div className={`${s.panel} ${s.walletPanel}`}>
        <div className={s.walletSummary}>
          <div className={s.walletSummaryHead}><small>My Wallet</small><Link href="/account?view=overview" onClick={()=>setPanel(null)}>Overview <UiIcon name="chevronRight" size={12}/></Link></div>
          <span className={s.walletLabel}>{displayCurrency==='KRW'?'Wallet Balance':'USDT Available'}</span>
          <strong className={s.walletBalance}>{walletLoading?'—':displayCurrency==='KRW'?(krwRate>0?Math.round(displayBalance).toLocaleString():'—'):formatUsdt(displayBalance)} <em>{displayCurrency==='KRW'?'KRW':'USDT'}</em></strong>
          <div className={s.walletBreakdown}>
            <div><small>Locked</small><b>{walletLoading?'—':displayCurrency==='KRW'?(krwRate>0?Math.round(spotLocked*krwRate).toLocaleString()+' KRW':'—'):formatUsdt(spotLocked)+' USDT'}</b></div>
            <div><small>Futures</small><b>{walletLoading?'—':displayCurrency==='KRW'?(krwRate>0?Math.round(futuresBalance*krwRate).toLocaleString()+' KRW':'—'):formatUsdt(futuresBalance)+' USDT'}</b></div>
          </div>
          <div className={s.walletActions}>
            <Link className={s.primaryAction} href="/deposit" onClick={()=>setPanel(null)}><UiIcon name="wallet" size={15}/>Deposit</Link>
            <Link href="/account?view=overview" onClick={()=>setPanel(null)}>Wallet</Link>
          </div>
        </div>
        <div className={s.accountList}>{walletItems.map(([icon,label,href])=><Link key={label} href={href} onClick={()=>setPanel(null)}><span><UiIcon name={icon} size={17}/></span><b>{label}</b></Link>)}</div>
      </div>}
    </div>

    <div className={s.rel} onMouseEnter={()=>setPanel('account')} onMouseLeave={()=>setPanel(v=>v==='account'?null:v)}>
      <button className={`${s.icon} ${panel==='account'?s.active:''}`} onClick={()=>toggle('account')} aria-label="Account"><UiIcon name="user" size={18}/></button>
      {panel==='account'&&<div className={`${s.panel} ${s.memberPanel}`}>
        <div className={s.memberHead}><div className={s.avatar}><UiIcon name="user" size={22}/></div><div className={s.memberIdentity}><b>{email?maskEmail(email):'Member'}</b><span>UID: {uid?uid.slice(0,16):'—'}</span><div><em>Unverified</em><strong>VIP 0</strong></div></div></div>
        <div className={s.memberList}>{memberItems.map(([icon,label,href])=><Link key={label} href={href} onClick={()=>setPanel(null)}><span><UiIcon name={icon} size={17}/></span><b>{label}</b></Link>)}</div>
        <button className={s.logout} onClick={logout}>Log Out</button>
      </div>}
    </div>

    <div className={s.rel}>
      <button className={`${s.icon} ${panel==='notifications'?s.active:''}`} onClick={()=>toggle('notifications')} aria-label="Notifications"><UiIcon name="bell" size={18}/><i/></button>
      {panel==='notifications'&&<div className={`${s.panel} ${s.notificationPanel}`}>
        <div className={s.noticeTop}><b>You've <em>1</em> unread notification</b><Link href="/more/notice" style={{display:'inline-flex',alignItems:'center',gap:4}}>More <UiIcon name="chevronRight" size={13}/></Link></div>
        {notificationItems.map(([icon,title,badge,text,time])=><div className={s.noticeRow} key={title}><div className={s.noticeTitle}><span><UiIcon name={icon} size={17}/></span><b>{title}</b>{badge&&<em>{badge}</em>}</div><strong>{text}</strong>{time&&<small>{time}</small>}</div>)}
      </div>}
    </div>
    <div className={s.rel}>
      <button className={`${s.icon} ${panel==='download'?s.active:''}`} onClick={()=>toggle('download')} aria-label="Download app"><UiIcon name="download" size={18}/></button>
      {panel==='download'&&<div className={`${s.panel} ${s.downloadPanel}`}><div className={s.qr} aria-label="App QR placeholder"><div className={s.qrGrid}><UiIcon name="overview" size={54}/></div></div><b>Scan to Download the<br/>BITMATE APP</b><button className={s.moreOptions}>More Options</button></div>}
    </div>
    <span className={s.lang} aria-label="Language"><UiIcon name="globe" size={18}/></span>
  </div>
}
