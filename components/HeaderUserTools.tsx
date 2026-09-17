'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import s from './HeaderUserTools.module.css';

type Panel='account'|'notifications'|'download'|null;

const accountItems=[
  ['▦','Overview','/account'],
  ['◉','Spot','/account'],
  ['↗','CFD Margin','/cfd'],
  ['▤','Futures','/futures'],
  ['◈','Crypto ETF','/crypto-etf/portfolio'],
  ['◎','Copy Trading','/my-copy'],
  ['⛏','Mining','/my-mining'],
  ['◆','BTMT Membership','/more/btmt-membership'],
  ['✓','Verification','/account'],
] as const;

export default function HeaderUserTools(){
  const [panel,setPanel]=useState<Panel>(null);
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{const close=(e:MouseEvent)=>{if(root.current&&!root.current.contains(e.target as Node))setPanel(null)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[]);
  const toggle=(next:Panel)=>setPanel(v=>v===next?null:next);
  return <div className={s.root} ref={root}>
    <Link className={s.deposit} href="/deposit">Deposit</Link>
    <Link className={s.icon} href="/account" aria-label="Wallet">▣</Link>
    <button className={s.icon} onClick={()=>toggle('account')} aria-label="Account">●</button>
    <div className={s.rel}>
      <button className={`${s.icon} ${panel==='notifications'?s.active:''}`} onClick={()=>toggle('notifications')} aria-label="Notifications">♟<i/></button>
      {panel==='notifications'&&<div className={`${s.panel} ${s.notificationPanel}`}>
        <div className={s.noticeTop}><b>You've <em>1</em> unread notification</b><Link href="/more/notice">More ›</Link></div>
        {[
          ['◖','System Notification','1','New Task Unlocked','2026-09-17 15:45:11'],
          ['◆','New Listings','','No updates at the moment',''],
          ['♨','Hot Campaigns','','No updates at the moment',''],
          ['●','Important Notices','','No updates at the moment',''],
          ['◎','Copy Trading Notification','','No updates at the moment',''],
          ['⚙','Bot Notification','','No updates at the moment',''],
          ['▦','Smart Money Notification','','No updates at the moment',''],
          ['♟','Price Alerts','','No updates at the moment',''],
        ].map(([icon,title,badge,text,time])=><div className={s.noticeRow} key={title}><div className={s.noticeTitle}><span>{icon}</span><b>{title}</b>{badge&&<em>{badge}</em>}</div><strong>{text}</strong>{time&&<small>{time}</small>}</div>)}
      </div>}
    </div>
    <div className={s.rel}>
      <button className={`${s.icon} ${panel==='download'?s.active:''}`} onClick={()=>toggle('download')} aria-label="Download app">⬇</button>
      {panel==='download'&&<div className={`${s.panel} ${s.downloadPanel}`}>
        <div className={s.qr} aria-label="App QR placeholder"><div className={s.qrGrid}>▦</div></div>
        <b>Scan to Download the<br/>BITMATE APP</b>
        <button className={s.moreOptions}>More Options</button>
      </div>}
    </div>
    <span className={s.lang}>◎</span>
    {panel==='account'&&<div className={`${s.panel} ${s.accountPanel}`}>
      <div className={s.promo}><small>Unlocking rewards</small><span>First deposit ≥ 20 USDT, get up to</span><strong>200 USDT</strong><Link href="/deposit">▣ &nbsp; Deposit Now</Link></div>
      <div className={s.accountList}>{accountItems.map(([icon,label,href])=><Link key={label} href={href} onClick={()=>setPanel(null)}><span>{icon}</span><b>{label}</b></Link>)}</div>
    </div>}
  </div>
}
