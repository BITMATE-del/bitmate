'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon,{type UiIconName} from './UiIcon';
import s from './AdminControlCenter.module.css';

type Module={
  title:string;
  description:string;
  href:string;
  icon:UiIconName;
  group:'거래·상품'|'콘텐츠·성장'|'운영·계정';
  status:'ACTIVE'|'VIEW';
};

const modules:Module[]=[
  {title:'Futures 관리',description:'선물 심볼, 거래 상태, 수수료, 레버리지, Funding, 포지션 및 계정 조정.',href:'/admin/futures',icon:'futures',group:'거래·상품',status:'ACTIVE'},
  {title:'CFD Margin 관리',description:'CFD 마켓 설정, 상품 상태, 운영 파라미터와 거래 제어.',href:'/admin/cfd',icon:'margin',group:'거래·상품',status:'ACTIVE'},
  {title:'AI Trading 관리',description:'AI 전략 상태, 전략 버전, 세션, 리스크 중지 및 운용 현황 관리.',href:'/admin/ai-core',icon:'strategy',group:'거래·상품',status:'ACTIVE'},
  {title:'Copy Trading 관리',description:'트레이더, 성과, 노출 상태, 카피 운용 및 관련 데이터 관리.',href:'/admin/copy-trading',icon:'copy',group:'거래·상품',status:'ACTIVE'},
  {title:'Crypto ETF 관리',description:'BITMATE INDEX 상품 구성, 상태 및 사용자 노출 관리.',href:'/admin/index',icon:'etf',group:'거래·상품',status:'ACTIVE'},
  {title:'Mining 관리',description:'채굴 상품, 보상, 상태, 운영 설정 및 사용자 노출 관리.',href:'/admin/mining',icon:'mining',group:'거래·상품',status:'ACTIVE'},
  {title:'Crypto Loan 관리',description:'담보 대출 상품, 조건, 상태, 금리 및 운영 데이터 관리.',href:'/admin/crypto-loan',icon:'loan',group:'거래·상품',status:'ACTIVE'},
  {title:'BTMT Membership',description:'등급, 스테이킹, 혜택 및 멤버십 운영 설정 관리.',href:'/admin/btmt-membership',icon:'membership',group:'거래·상품',status:'ACTIVE'},
  {title:'Lucky Draw 관리',description:'추첨, 보상, 이벤트 상태 및 행운볼 관련 운영 관리.',href:'/admin/lucky-draw',icon:'lucky',group:'콘텐츠·성장',status:'ACTIVE'},
  {title:'공지사항 관리',description:'서비스 공지, 점검, 시스템 업데이트 및 사용자 노출 공지 관리.',href:'/admin/notices',icon:'listing',group:'콘텐츠·성장',status:'ACTIVE'},
  {title:'랜딩 이미지 관리',description:'홈 히어로와 제품 프리뷰 등 랜딩 미디어 슬롯 업로드 및 교체.',href:'/admin/landing-media',icon:'campaign',group:'콘텐츠·성장',status:'ACTIVE'},
  {title:'Referral / Reward Hub',description:'현재 운영 화면을 확인하고 다음 관리 확장 대상에 포함합니다.',href:'/more/reward-hub',icon:'referral',group:'콘텐츠·성장',status:'VIEW'},
  {title:'회원 · 자산 · 운영 관리',description:'회원 검색, VIP/프로필, KYC 승인, 삭제 요청, DEMO 잔액/원장, 시스템 스위치 관리.',href:'/admin/operations',icon:'user',group:'운영·계정',status:'ACTIVE'},
  {title:'회원 센터',description:'회원 프로필, 인증, 보안, API, 알림 및 설정 화면 확인.',href:'/member',icon:'user',group:'운영·계정',status:'VIEW'},
  {title:'지갑 / 자산 센터',description:'Spot, Margin, Futures, Earn, Copy, Strategy, Insurance 계정 화면 확인.',href:'/account',icon:'wallet',group:'운영·계정',status:'VIEW'},
  {title:'입금 시스템',description:'BTC, ETH, USDT, SOL, TRX 및 네트워크 선택형 입금 화면 확인.',href:'/deposit',icon:'wallet',group:'운영·계정',status:'VIEW'},
  {title:'P2P Markets',description:'P2P 마켓 사용자 화면 및 현재 서비스 상태 확인.',href:'/p2p-markets',icon:'market',group:'운영·계정',status:'VIEW'},
];

const groups:Module['group'][]=['거래·상품','콘텐츠·성장','운영·계정'];

export default function AdminControlCenter(){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [role,setRole]=useState('');
  const [email,setEmail]=useState('');
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<'ALL'|'ACTIVE'|'VIEW'>('ALL');

  useEffect(()=>{
    let alive=true;
    supabase.auth.getUser().then(({data:{user}})=>{
      if(!alive)return;
      const r=String(user?.app_metadata?.role||'').toLowerCase();
      const superadmin=user?.app_metadata?.superadmin===true;
      setRole(superadmin?'superadmin':r||'user');
      setEmail(user?.email||'');
      setAllowed(r==='admin'||r==='superadmin'||superadmin);
    });
    return()=>{alive=false};
  },[supabase]);

  if(allowed===null)return <main className={`${s.page} ${s.checking}`}><div className={s.gate}><div className={s.adminBadge}><span className={s.dot}/>ACCESS CHECK</div><h1>관리자 권한 확인 중</h1><p>BITMATE 운영 권한과 세션을 확인하고 있습니다.</p></div></main>;
  if(!allowed)return <main className={`${s.page} ${s.denied}`}><div className={s.gate}><div className={s.adminBadge}>BITMATE ADMIN</div><h1>관리자 권한이 필요합니다.</h1><p>현재 계정에는 관리자 접근 권한이 없습니다. 관리자 또는 슈퍼어드민 계정으로 로그인하세요.</p><Link className={s.btn} href="/">홈으로 이동</Link></div></main>;

  const q=query.trim().toLowerCase();
  const visible=modules.filter(m=>(filter==='ALL'||m.status===filter)&&(!q||`${m.title} ${m.description} ${m.group}`.toLowerCase().includes(q)));
  const activeCount=modules.filter(m=>m.status==='ACTIVE').length;

  return <main className={s.page}><div className={s.shell}>
    <section className={s.top}>
      <div><div className={s.eyebrow}>BITMATE OPERATIONS</div><h1>Admin Control Center</h1><p>현재 BITMATE에 구현된 거래, 상품, 랜딩, 공지, 회원·자산 관련 기능을 한 곳에서 점검하고 관리하는 통합 운영 허브입니다. 기존 개별 관리자 페이지는 유지하고 이 화면에서 전체 기능으로 진입합니다.</p></div>
      <div className={s.topActions}><Link className={s.btnGhost} href="/">사이트 보기</Link><Link className={s.btn} href="/admin/operations">회원·운영 관리</Link></div>
    </section>

    <section className={s.stats}>
      <div className={s.stat}><small>관리 모듈</small><strong>{modules.length}</strong></div>
      <div className={s.stat}><small>즉시 수정 가능</small><strong>{activeCount}</strong></div>
      <div className={s.stat}><small>운영 상태</small><strong className={s.statusGood}>ONLINE</strong></div>
      <div className={s.stat}><small>접속 계정</small><strong style={{fontSize:15}}>{email||'—'} · {role.toUpperCase()}</strong></div>
    </section>

    <div className={s.toolbar}>
      <input className={s.search} value={query} onChange={e=>setQuery(e.target.value)} placeholder="관리 기능 검색: Futures, 입금, 공지, 회원..."/>
      <select className={s.filter} value={filter} onChange={e=>setFilter(e.target.value as 'ALL'|'ACTIVE'|'VIEW')}><option value="ALL">전체</option><option value="ACTIVE">수정 가능</option><option value="VIEW">확인 / 확장 예정</option></select>
    </div>

    {groups.map(group=>{
      const rows=visible.filter(m=>m.group===group);
      if(!rows.length)return null;
      return <section className={s.section} key={group}><div className={s.sectionHead}><h2>{group}</h2><span>{rows.length} modules</span></div><div className={s.grid}>{rows.map(m=><Link className={s.card} href={m.href} key={m.title}><div className={s.cardTop}><span className={s.icon}><UiIcon name={m.icon} size={20}/></span><span className={`${s.pill} ${m.status==='ACTIVE'?s.pillActive:''}`}>{m.status==='ACTIVE'?'MANAGE':'VIEW'}</span></div><h3>{m.title}</h3><p>{m.description}</p><div className={s.cardFoot}><span>{m.group}</span><strong>{m.status==='ACTIVE'?'관리 열기':'화면 확인'} →</strong></div></Link>)}</div></section>
    })}

    <section className={s.coverage}><h2>관리 범위 상태</h2><div className={s.coverageRows}><div className={s.coverageRow}><span>거래 핵심 엔진</span><b>Futures / CFD / AI / Copy 관리 연결</b></div><div className={s.coverageRow}><span>상품 운영</span><b>ETF / Mining / Loan / Membership 연결</b></div><div className={s.coverageRow}><span>콘텐츠 운영</span><b>공지 / 랜딩 이미지 / Lucky Draw 연결</b></div><div className={s.coverageRow}><span>회원·지갑 운영</span><b>회원/KYC/삭제요청/DEMO 원장/시스템 스위치 관리 연결</b></div></div></section>
  </div></main>;
}
