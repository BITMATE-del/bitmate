'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon,{type UiIconName} from './UiIcon';
import s from './AdminControlCenter.module.css';

type Task={label:string;count:number;href:string;tone:'warn'|'bad'|'info'};
type Kpi={label:string;value:string;hint?:string};
type CoreLink={label:string;href:string;icon:UiIconName;desc:string};

const coreLinks:CoreLink[]=[
  {label:'회원관리',href:'/admin/operations',icon:'user',desc:'회원 검색, KYC, 동결, 비밀번호 초기화, 잔액 확인'},
  {label:'입출금 관리',href:'/admin/wallet-ops?tab=withdrawals',icon:'order',desc:'입금/출금 요청과 승인 대기 건을 한곳에서 처리'},
  {label:'지갑 관리',href:'/admin/wallet',icon:'wallet',desc:'회원별 통합 지갑, 잔액 수정, 네트워크와 원장 운영'},
  {label:'Crypto Loan 관리',href:'/admin/crypto-loan',icon:'loan',desc:'승인 대기, 연장 요청, 연체 검토, 담보 상태 관리'},
  {label:'공지사항 관리',href:'/admin/notices',icon:'listing',desc:'공지 목록과 게시 내용을 즉시 수정'},
  {label:'Lucky Draw 관리',href:'/admin/lucky-draw',icon:'lucky',desc:'이벤트, 확률 버전, 보상 지급 상태 관리'},
  {label:'랜딩 이미지 관리',href:'/admin/landing-media',icon:'campaign',desc:'메인/모바일 랜딩 미디어 미리보기와 교체'},
];

export default function AdminControlCenter(){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [role,setRole]=useState('');
  const [email,setEmail]=useState('');
  const [loading,setLoading]=useState(true);
  const [ops,setOps]=useState<any>({stats:{},users:[],kyc:[],deletions:[]});
  const [wallet,setWallet]=useState<any>({stats:{},deposits:[],withdrawals:[],balances:[]});
  const [loan,setLoan]=useState<any>({loans:[]});

  useEffect(()=>{
    let alive=true;
    const load=async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!alive)return;
      const r=String(user?.app_metadata?.role||'').toLowerCase();
      const superadmin=user?.app_metadata?.superadmin===true;
      const ok=r==='admin'||r==='superadmin'||superadmin;
      setRole(superadmin?'superadmin':r||'user');setEmail(user?.email||'');setAllowed(ok);
      if(!ok){setLoading(false);return}
      const [{data:o},{data:w},{data:l}]=await Promise.all([
        supabase.rpc('admin_ops_snapshot',{p_query:''}),
        supabase.rpc('admin_wallet_ops_snapshot'),
        supabase.rpc('admin_crypto_loan_snapshot_v2')
      ]);
      if(!alive)return;
      setOps(o||{stats:{}});setWallet(w||{stats:{}});setLoan(l||{loans:[]});setLoading(false);
    };
    void load();
    const id=setInterval(()=>void load(),30000);
    return()=>{alive=false;clearInterval(id)};
  },[supabase]);

  if(allowed===null||loading)return <main className={`${s.page} ${s.checking}`}><div className={s.gate}><div className={s.adminBadge}><span className={s.dot}/>OPERATIONS CHECK</div><h1>오늘 운영 현황을 불러오는 중</h1><p>회원, 입출금, 지갑, Loan 처리 대기 건을 확인하고 있습니다.</p></div></main>;
  if(!allowed)return <main className={`${s.page} ${s.denied}`}><div className={s.gate}><div className={s.adminBadge}>BITMATE ADMIN</div><h1>관리자 권한이 필요합니다.</h1><p>현재 계정에는 관리자 접근 권한이 없습니다.</p><Link className={s.btn} href="/">홈으로 이동</Link></div></main>;

  const loans=Array.isArray(loan?.loans)?loan.loans:[];
  const today=new Date().toISOString().slice(0,10);
  const isToday=(v?:string|null)=>!!v&&String(v).slice(0,10)===today;
  const pendingWithdraw=Number(wallet?.stats?.withdraw_pending||0);
  const pendingLoan=loans.filter((x:any)=>x.status==='PENDING').length;
  const extension=loans.filter((x:any)=>x.status==='EXTENSION_REQUESTED').length;
  const overdueReview=loans.filter((x:any)=>x.status==='OVERDUE_REVIEW').length;
  const activeLoan=loans.filter((x:any)=>['ACTIVE','EXTENDED','EXTENSION_OFFERED','EXTENSION_REQUESTED'].includes(String(x.status))).length;
  const todayDeposits=(wallet?.deposits||[]).filter((x:any)=>isToday(x.created_at)).reduce((a:number,x:any)=>a+Number(x.amount||0),0);
  const todayWithdrawals=(wallet?.withdrawals||[]).filter((x:any)=>isToday(x.created_at)).reduce((a:number,x:any)=>a+Number(x.amount||0),0);
  const totalWallet=(wallet?.balances||[]).filter((x:any)=>String(x.asset).toUpperCase()==='USDT').reduce((a:number,x:any)=>a+Number(x.available||0)+Number(x.locked||0),0);
  const newUsers=(ops?.users||[]).filter((x:any)=>isToday(x.created_at)).length;
  const tasks:Task[]=[
    {label:'출금 승인 대기',count:pendingWithdraw,href:'/admin/wallet-ops?tab=withdrawals',tone:'warn'},
    {label:'대출 승인 대기',count:pendingLoan,href:'/admin/crypto-loan?status=PENDING',tone:'warn'},
    {label:'Loan 연장 요청',count:extension,href:'/admin/crypto-loan?status=EXTENSION_REQUESTED',tone:'info'},
    {label:'연체 검토',count:overdueReview,href:'/admin/crypto-loan?status=OVERDUE_REVIEW',tone:'bad'},
    {label:'KYC 검토',count:Number(ops?.stats?.kyc_pending||0),href:'/admin/operations?tab=kyc',tone:'info'},
  ];
  const kpis:Kpi[]=[
    {label:'전체 회원',value:Number(ops?.stats?.users||0).toLocaleString()},
    {label:'오늘 신규 가입',value:newUsers.toLocaleString()},
    {label:'승인 대기 출금',value:pendingWithdraw.toLocaleString()},
    {label:'승인 대기 대출',value:pendingLoan.toLocaleString()},
    {label:'오늘 입금',value:`${todayDeposits.toLocaleString()} USDT`},
    {label:'오늘 출금',value:`${todayWithdrawals.toLocaleString()} USDT`},
    {label:'전체 지갑 잔액',value:`${totalWallet.toLocaleString()} USDT`},
    {label:'진행 중 Loan',value:activeLoan.toLocaleString()},
  ];

  return <main className={s.page}><div className={s.shell}>
    <section className={s.top}><div><div className={s.eyebrow}>BITMATE OPERATIONS</div><h1>오늘 처리해야 할 업무</h1><p>운영자가 가장 많이 사용하는 승인, 회원, 지갑, Loan 업무를 먼저 보여줍니다. 기존 관리자 기능과 URL은 그대로 유지됩니다.</p></div><div className={s.identity}><span>접속 관리자</span><b>{email||'—'}</b><small>{role.toUpperCase()}</small></div></section>

    <section className={s.taskSection}><div className={s.sectionTitle}><div><span>PRIORITY</span><h2>처리 필요</h2></div><small>30초마다 최신 상태 확인</small></div><div className={s.taskGrid}>{tasks.map(t=><Link key={t.label} href={t.href} className={`${s.taskCard} ${s[t.tone]}`}><span>{t.label}</span><strong>{t.count.toLocaleString()}건</strong><em>바로 처리 →</em></Link>)}</div></section>

    <section className={s.quickSection}><div className={s.sectionTitle}><div><span>QUICK ACTION</span><h2>빠른 작업</h2></div></div><div className={s.quickGrid}>
      <Link href="/admin/operations">회원 검색</Link><Link href="/admin/wallet-ops?tab=withdrawals">출금 승인</Link><Link href="/admin/crypto-loan?status=PENDING">대출 승인</Link><Link href="/admin/wallet-ops?tab=balances">잔액 수정</Link><Link href="/admin/notices">공지 관리</Link><Link href="/admin/landing-media">랜딩 이미지 변경</Link><Link href="/admin/lucky-draw">Lucky Draw 관리</Link>
    </div></section>

    <section className={s.stats}>{kpis.map(k=><div className={s.stat} key={k.label}><small>{k.label}</small><strong>{k.value}</strong>{k.hint&&<span>{k.hint}</span>}</div>)}</section>

    <section className={s.coreSection}><div className={s.sectionTitle}><div><span>CORE OPERATIONS</span><h2>핵심 관리 메뉴</h2></div><small>자주 쓰는 메뉴는 항상 바로 접근</small></div><div className={s.coreGrid}>{coreLinks.map(m=><Link href={m.href} className={s.coreCard} key={m.label}><span className={s.icon}><UiIcon name={m.icon} size={19}/></span><div><h3>{m.label}</h3><p>{m.desc}</p></div><b>→</b></Link>)}</div></section>

    <section className={s.secondary}><div className={s.sectionTitle}><div><span>SECONDARY</span><h2>거래 운영 / 시스템</h2></div></div><div className={s.secondaryLinks}><Link href="/admin/futures">Futures</Link><Link href="/admin/cfd">CFD</Link><Link href="/admin/cfd-rounds">CFD 판정보정</Link><Link href="/admin/index">ETF</Link><Link href="/admin/mining">Mining</Link><Link href="/admin/ai-core">AI Trading</Link><Link href="/admin/copy-trading">Copy Trading</Link><Link href="/admin/services">서비스·권한·로그</Link><Link href="/admin/p2p">P2P</Link></div></section>
  </div></main>;
}
