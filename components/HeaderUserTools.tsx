'use client';

import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon,{type UiIconName} from './UiIcon';
import s from './HeaderUserTools.module.css';

type Panel='wallet'|'account'|'notifications'|'download'|null;
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
  const [email,setEmail]=useState('');
  const [uid,setUid]=useState('');
  const [wallet,setWallet]=useState<WalletSnapshot>({spot:[],futures_usdt:0});
  const [walletLoading,setWalletLoading]=useState(false);
  const root=useRef<HTMLDivElement>(null);

  useEffect(()=>{supabase.auth.getUser().then(({data:{user}})=>{if(user){setEmail(user.email||'');setUid(user.id||'')}})},[supabase]);
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
  const totalBalance=spotAvailable+spotLocked+futuresBalance;

  return <div className={s.root} ref={root}>
    <Link className={s.deposit} href="/deposit">Deposit</Link>

    <div className={s.rel} onMouseEnter={()=>setPanel('wallet')} onMouseLeave={()=>setPanel(v=>v==='wallet'?null:v)}>
      <button className={`${s.icon} ${panel==='wallet'?s.active:''}`} onClick={()=>toggle('wallet')} aria-label="Wallet"><UiIcon name="wallet" size={18}/></button>
      {panel==='wallet'&&<div className={`${s.panel} ${s.walletPanel}`}>
        <div className={s.walletSummary}>
          <div className={s.walletSummaryHead}><small>My Wallet</small><Link href="/account?view=overview" onClick={()=>setPanel(null)}>Overview <UiIcon name="chevronRight" size={12}/></Link></div>
          <span className={s.walletLabel}>USDT Balance</span>
          <strong className={s.walletBalance}>{walletLoading?'—':formatUsdt(totalBalance)} <em>USDT</em></strong>
          <div className={s.walletBreakdown}>
            <div><small>Spot Available</small><b>{walletLoading?'—':formatUsdt(spotAvailable)}</b></div>
            <div><small>Futures</small><b>{walletLoading?'—':formatUsdt(futuresBalance)}</b></div>
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
