'use client';

import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useMemo} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon from './UiIcon';
import s from './AdminShell.module.css';

const nav=[
  ['/admin','overview','Dashboard'],
  ['/admin/operations','user','Members'],
  ['/admin/wallet-ops','wallet','Wallet'],
  ['/admin/services','security','Services'],
  ['/admin/p2p','market','P2P'],
  ['/admin/futures','futures','Futures'],
  ['/admin/cfd','margin','CFD'],
  ['/admin/notices','listing','Notice'],
  ['/admin/landing-media','campaign','Media'],
] as const;

export default function AdminShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const router=useRouter();
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  if(pathname==='/admin/login')return <>{children}</>;

  const logout=async()=>{
    await fetch('/api/admin/session',{method:'DELETE'});
    await supabase.auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  };

  return <div className={s.adminRoot}>
    <header className={s.bar}>
      <Link href="/admin" className={s.brand}><span>B</span><div><b>BITMATE</b><small>ADMIN CONSOLE</small></div></Link>
      <nav className={s.nav}>{nav.map(([href,icon,label])=><Link key={href} href={href} className={pathname===href||pathname.startsWith(href+'/')?s.active:''}><UiIcon name={icon} size={16}/><span>{label}</span></Link>)}</nav>
      <div className={s.actions}><a href="/" target="_blank" rel="noreferrer">사이트 보기</a><button onClick={logout}>Log out</button></div>
    </header>
    <div className={s.notice}><UiIcon name="security" size={14}/><span>관리자 전용 세션 · 공개 사이트 UI와 분리 · 검색엔진 차단 · 서버 권한 검증</span></div>
    <div className={s.content}>{children}</div>
  </div>;
}
