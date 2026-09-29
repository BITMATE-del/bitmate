'use client';

import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon,{type UiIconName} from './UiIcon';
import s from './AdminShell.module.css';

type NavItem={href:string;icon:UiIconName;label:string;badgeKey?:'members'|'wallet'|'loan'};
const core:NavItem[]=[
  {href:'/admin',icon:'overview',label:'대시보드'},
  {href:'/admin/operations',icon:'user',label:'회원관리',badgeKey:'members'},
  {href:'/admin/wallet-ops?tab=withdrawals',icon:'order',label:'입출금 관리',badgeKey:'wallet'},
  {href:'/admin/wallet-ops?tab=balances',icon:'wallet',label:'지갑 관리'},
  {href:'/admin/crypto-loan',icon:'loan',label:'Crypto Loan 관리',badgeKey:'loan'},
  {href:'/admin/notices',icon:'listing',label:'공지사항 관리'},
  {href:'/admin/lucky-draw',icon:'lucky',label:'Lucky Draw 관리'},
  {href:'/admin/landing-media',icon:'campaign',label:'랜딩 이미지 관리'},
];
const trade:NavItem[]=[
  {href:'/admin/futures',icon:'futures',label:'Futures'},
  {href:'/admin/cfd',icon:'margin',label:'CFD'},
  {href:'/admin/cfd-rounds',icon:'margin',label:'CFD 판정보정'},
  {href:'/trade/spot',icon:'spot',label:'Spot'},
  {href:'/admin/index',icon:'etf',label:'ETF'},
  {href:'/admin/mining',icon:'mining',label:'Mining'},
  {href:'/admin/ai-core',icon:'strategy',label:'AI Trading'},
  {href:'/admin/copy-trading',icon:'copy',label:'Copy Trading'},
];
const system:NavItem[]=[
  {href:'/admin/services',icon:'security',label:'서비스 / 권한 / 로그'},
  {href:'/admin/p2p',icon:'market',label:'P2P 관리'},
  {href:'/admin/btmt-membership',icon:'membership',label:'BTMT Membership'},
];

type Badges={members:number;wallet:number;loan:number};

export default function AdminShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const router=useRouter();
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [tradeOpen,setTradeOpen]=useState(true);
  const [systemOpen,setSystemOpen]=useState(false);
  const [search,setSearch]=useState('');
  const [badges,setBadges]=useState<Badges>({members:0,wallet:0,loan:0});
  if(pathname==='/admin/login')return <>{children}</>;

  useEffect(()=>{setMobileOpen(false)},[pathname]);

  useEffect(()=>{
    let alive=true;
    const load=async()=>{
      const [{data:ops},{data:wallet},{data:loan}]=await Promise.all([
        supabase.rpc('admin_ops_snapshot',{p_query:''}),
        supabase.rpc('admin_wallet_ops_snapshot'),
        supabase.rpc('admin_crypto_loan_snapshot_v2')
      ]);
      if(!alive)return;
      const loans=Array.isArray((loan as any)?.loans)?(loan as any).loans:[];
      setBadges({
        members:Number((ops as any)?.stats?.kyc_pending||0)+Number((ops as any)?.stats?.deletion_pending||0),
        wallet:Number((wallet as any)?.stats?.withdraw_pending||0),
        loan:loans.filter((x:any)=>['PENDING','EXTENSION_REQUESTED','OVERDUE_REVIEW'].includes(String(x?.status))).length
      });
    };
    void load();
    const id=setInterval(()=>void load(),30000);
    return()=>{alive=false;clearInterval(id)};
  },[supabase]);

  const logout=async()=>{
    await fetch('/api/admin/session',{method:'DELETE'});
    await supabase.auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  };

  const submitSearch=(e:React.FormEvent)=>{
    e.preventDefault();
    const q=search.trim();
    if(!q)return;
    const upper=q.toUpperCase();
    if(upper.startsWith('LOAN-'))router.push('/admin/crypto-loan?status=ALL&q='+encodeURIComponent(q));
    else router.push('/admin/operations?q='+encodeURIComponent(q));
  };

  const isActive=(href:string)=>{
    const clean=href.split('?')[0];
    return clean==='/admin'?pathname==='/admin':pathname===clean||pathname.startsWith(clean+'/');
  };
  const navItem=(item:NavItem)=>{
    const count=item.badgeKey?badges[item.badgeKey]:0;
    return <Link key={item.href} href={item.href} className={isActive(item.href)?s.active:''}>
      <UiIcon name={item.icon} size={17}/><span>{item.label}</span>{count>0&&<b className={s.badge}>{count>99?'99+':count}</b>}
    </Link>;
  };

  return <div className={s.adminRoot}>
    <aside className={`${s.sidebar} ${mobileOpen?s.sidebarOpen:''}`}>
      <div className={s.sideHead}><Link href="/admin" className={s.brand}><span>B</span><div><b>BITMATE</b><small>ADMIN CONSOLE</small></div></Link><button className={s.closeMobile} onClick={()=>setMobileOpen(false)}>×</button></div>
      <div className={s.priorityLabel}>핵심 운영</div>
      <nav className={s.nav}>{core.map(navItem)}</nav>
      <div className={s.group}>
        <button className={s.groupToggle} onClick={()=>setTradeOpen(v=>!v)}><span>거래 운영</span><b>{tradeOpen?'−':'+'}</b></button>
        {tradeOpen&&<nav className={`${s.nav} ${s.subNav}`}>{trade.map(navItem)}</nav>}
      </div>
      <div className={s.group}>
        <button className={s.groupToggle} onClick={()=>setSystemOpen(v=>!v)}><span>시스템 / 기타</span><b>{systemOpen?'−':'+'}</b></button>
        {systemOpen&&<nav className={`${s.nav} ${s.subNav}`}>{system.map(navItem)}</nav>}
      </div>
      <div className={s.sideFoot}><a href="/" target="_blank" rel="noreferrer">사용자 사이트 보기 ↗</a><button onClick={logout}>로그아웃</button></div>
    </aside>

    {mobileOpen&&<button className={s.scrim} aria-label="메뉴 닫기" onClick={()=>setMobileOpen(false)}/>}

    <div className={s.workspace}>
      <header className={s.topbar}>
        <button className={s.menuButton} onClick={()=>setMobileOpen(true)}><UiIcon name="menu" size={20}/></button>
        <form className={s.globalSearch} onSubmit={submitSearch}>
          <UiIcon name="search" size={16}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="이메일 / UID / 회원명 / Loan ID 검색"/>
          <button type="submit">검색</button>
        </form>
        <div className={s.topActions}><Link href="/admin/wallet-ops?tab=withdrawals">출금 승인</Link><Link href="/admin/crypto-loan?status=PENDING">대출 승인</Link></div>
      </header>
      <div className={s.notice}><UiIcon name="security" size={14}/><span>관리자 세션 · 기존 서버 권한 검증 유지 · 주요 변경은 감사 로그 기록</span></div>
      <div className={s.content}>{children}</div>
    </div>
  </div>;
}
