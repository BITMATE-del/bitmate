'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import s from './HeaderUserTools.module.css';

type Panel='wallet'|'account'|'notifications'|'download'|null;
type IconName='wallet'|'user'|'bell'|'download'|'globe';

function Icon({name}:{name:IconName}){
  const common={width:18,height:18,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true};
  if(name==='wallet')return <svg {...common}><path d="M4 7.5h13.5A2.5 2.5 0 0 1 20 10v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17V7.5Z"/><path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H17"/><path d="M15 13.5h5"/><circle cx="15" cy="13.5" r=".8" fill="currentColor" stroke="none"/></svg>;
  if(name==='user')return <svg {...common}><circle cx="12" cy="8" r="3.3"/><path d="M5.5 19c.9-3.4 3.2-5.2 6.5-5.2s5.6 1.8 6.5 5.2"/></svg>;
  if(name==='bell')return <svg {...common}><path d="M6.5 9.8a5.5 5.5 0 0 1 11 0c0 5 2.1 5.2 2.1 6.7H4.4c0-1.5 2.1-1.7 2.1-6.7Z"/><path d="M9.7 19a2.6 2.6 0 0 0 4.6 0"/></svg>;
  if(name==='download')return <svg {...common}><path d="M12 4v10"/><path d="m8.5 10.5 3.5 3.5 3.5-3.5"/><path d="M5 19h14"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4"/><path d="M12 3.5c2.2 2.4 3.3 5.2 3.3 8.5S14.2 18.1 12 20.5"/><path d="M12 3.5C9.8 5.9 8.7 8.7 8.7 12s1.1 6.1 3.3 8.5"/></svg>;
}

const walletItems=[
  ['▦','Overview','/account'],['◉','Spot','/account'],['↗','Margin','/cfd'],['▤','Futures','/futures'],['♙','Earn','/mining'],['▧','Copy Trading','/my-copy'],['⚙','Strategy','/ai-core'],['◈','Insurance Account','/account'],['✓','Verification','/account'],
] as const;
const memberItems=[
  ['▦','Overview','/account'],['▣','Order','/account'],['◆','KYC Verification','/account'],['◉','Security Center','/account'],['↗','API Management','/account'],['⚙','Settings','/account'],['▣','Referral Rewards','/more/referral'],['▤','My Vouchers','/more/reward-hub'],['◉','Sub-account','/account'],
] as const;

function maskEmail(email:string){const [name,domain='']=email.split('@');if(!domain)return email;return `${name.slice(0,2)}***@${domain}`}

export default function HeaderUserTools(){
  const supabase=createBrowserSupabase();
  const [panel,setPanel]=useState<Panel>(null);
  const [email,setEmail]=useState('');
  const [uid,setUid]=useState('');
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{supabase.auth.getUser().then(({data:{user}})=>{if(user){setEmail(user.email||'');setUid(user.id||'')}})},[]);
  useEffect(()=>{const close=(e:MouseEvent)=>{if(root.current&&!root.current.contains(e.target as Node))setPanel(null)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[]);
  const toggle=(next:Panel)=>setPanel(v=>v===next?null:next);
  const logout=async()=>{await supabase.auth.signOut();location.href='/'};
  return <div className={s.root} ref={root}>
    <Link className={s.deposit} href="/deposit">Deposit</Link>

    <div className={s.rel} onMouseEnter={()=>setPanel('wallet')} onMouseLeave={()=>setPanel(v=>v==='wallet'?null:v)}>
      <button className={`${s.icon} ${panel==='wallet'?s.active:''}`} onClick={()=>toggle('wallet')} aria-label="Wallet"><Icon name="wallet"/></button>
      {panel==='wallet'&&<div className={`${s.panel} ${s.walletPanel}`}>
        <div className={s.promo}><small>Unlocking rewards</small><span>First deposit ≥ 20 USDT, get up to</span><strong>200 USDT</strong><Link href="/deposit">▣ &nbsp; Deposit Now</Link></div>
        <div className={s.accountList}>{walletItems.map(([icon,label,href])=><Link key={label} href={href} onClick={()=>setPanel(null)}><span>{icon}</span><b>{label}</b></Link>)}</div>
      </div>}
    </div>

    <div className={s.rel} onMouseEnter={()=>setPanel('account')} onMouseLeave={()=>setPanel(v=>v==='account'?null:v)}>
      <button className={`${s.icon} ${panel==='account'?s.active:''}`} onClick={()=>toggle('account')} aria-label="Account"><Icon name="user"/></button>
      {panel==='account'&&<div className={`${s.panel} ${s.memberPanel}`}>
        <div className={s.memberHead}><div className={s.avatar}>●</div><div className={s.memberIdentity}><b>{email?maskEmail(email):'Member'}</b><span>UID: {uid?uid.slice(0,16):'—'} <small>▣</small></span><div><em>Unverified</em><strong>VIP 0</strong></div></div></div>
        <div className={s.memberList}>{memberItems.map(([icon,label,href])=><Link key={label} href={href} onClick={()=>setPanel(null)}><span>{icon}</span><b>{label}</b></Link>)}</div>
        <button className={s.logout} onClick={logout}>Log Out</button>
      </div>}
    </div>

    <div className={s.rel}>
      <button className={`${s.icon} ${panel==='notifications'?s.active:''}`} onClick={()=>toggle('notifications')} aria-label="Notifications"><Icon name="bell"/><i/></button>
      {panel==='notifications'&&<div className={`${s.panel} ${s.notificationPanel}`}>
        <div className={s.noticeTop}><b>You've <em>1</em> unread notification</b><Link href="/more/notice">More ›</Link></div>
        {[
          ['◖','System Notification','1','New Task Unlocked','2026-09-17 15:45:11'],['◆','New Listings','','No updates at the moment',''],['♨','Hot Campaigns','','No updates at the moment',''],['●','Important Notices','','No updates at the moment',''],['◎','Copy Trading Notification','','No updates at the moment',''],['⚙','Bot Notification','','No updates at the moment',''],['▦','Smart Money Notification','','No updates at the moment',''],['♟','Price Alerts','','No updates at the moment',''],
        ].map(([icon,title,badge,text,time])=><div className={s.noticeRow} key={title}><div className={s.noticeTitle}><span>{icon}</span><b>{title}</b>{badge&&<em>{badge}</em>}</div><strong>{text}</strong>{time&&<small>{time}</small>}</div>)}
      </div>}
    </div>
    <div className={s.rel}>
      <button className={`${s.icon} ${panel==='download'?s.active:''}`} onClick={()=>toggle('download')} aria-label="Download app"><Icon name="download"/></button>
      {panel==='download'&&<div className={`${s.panel} ${s.downloadPanel}`}><div className={s.qr} aria-label="App QR placeholder"><div className={s.qrGrid}>▦</div></div><b>Scan to Download the<br/>BITMATE APP</b><button className={s.moreOptions}>More Options</button></div>}
    </div>
    <span className={s.lang} aria-label="Language"><Icon name="globe"/></span>
  </div>
}
