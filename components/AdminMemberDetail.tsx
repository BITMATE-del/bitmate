'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import UiIcon from './UiIcon';
import s from './AdminMemberDetail.module.css';

type Tab='summary'|'wallet'|'cashflow'|'loan'|'trade';

export default function AdminMemberDetail({userId}:{userId:string}){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [tab,setTab]=useState<Tab>('summary');
  const [loading,setLoading]=useState(true);
  const [member,setMember]=useState<any>(null);
  const [wallet,setWallet]=useState<any>({balances:[],deposits:[],withdrawals:[]});
  const [loans,setLoans]=useState<any[]>([]);
  const [msg,setMsg]=useState('');

  useEffect(()=>{
    let alive=true;
    const load=async()=>{
      setLoading(true);setMsg('');
      const [{data:o,error:oe},{data:w,error:we},{data:l,error:le}]=await Promise.all([
        supabase.rpc('admin_ops_snapshot',{p_query:userId}),
        supabase.rpc('admin_wallet_ops_snapshot'),
        supabase.rpc('admin_crypto_loan_snapshot_v2')
      ]);
      if(!alive)return;
      if(oe||we||le){setMsg(oe?.message||we?.message||le?.message||'회원 정보를 불러오지 못했습니다.');setLoading(false);return}
      const user=(o as any)?.users?.find((x:any)=>x.id===userId)||(o as any)?.users?.[0]||null;
      setMember(user);
      setWallet({
        balances:((w as any)?.balances||[]).filter((x:any)=>x.user_id===userId),
        deposits:((w as any)?.deposits||[]).filter((x:any)=>x.user_id===userId),
        withdrawals:((w as any)?.withdrawals||[]).filter((x:any)=>x.user_id===userId)
      });
      setLoans(((l as any)?.loans||[]).filter((x:any)=>x.user_id===userId));
      setLoading(false);
    };
    void load();
    return()=>{alive=false};
  },[supabase,userId]);

  if(loading)return <main className={s.page}><div className={s.gate}>회원 상세 정보를 불러오는 중...</div></main>;
  if(!member)return <main className={s.page}><div className={s.gate}><h1>회원을 찾을 수 없습니다.</h1><p>{msg||'검색 결과가 없습니다.'}</p><Link href="/admin/operations">회원관리로 돌아가기</Link></div></main>;

  const usdt=wallet.balances.find((x:any)=>String(x.asset).toUpperCase()==='USDT');
  const activeLoans=loans.filter((x:any)=>['PENDING','ACTIVE','EXTENDED','EXTENSION_REQUESTED','EXTENSION_OFFERED','OVERDUE_REVIEW','OVERDUE'].includes(String(x.status)));
  const tabs:[Tab,string][]=[['summary','요약'],['wallet','지갑'],['cashflow','입출금'],['loan','Loan'],['trade','거래/서비스']];

  return <main className={s.page}><div className={s.shell}>
    <header className={s.head}><div><Link href="/admin/operations" className={s.back}>← 회원관리</Link><h1>{member.display_name||member.email||'회원 상세'}</h1><p>{member.email||'—'} · UID {member.id}</p></div><div className={s.status}><span className={member.frozen?s.bad:s.good}>{member.frozen?'동결':'정상'}</span><b>{member.vip_level||'BASIC'}</b><small>KYC {member.kyc_status}</small></div></header>

    <section className={s.overview}><div><span>가입일</span><b>{new Date(member.created_at).toLocaleString('ko-KR')}</b></div><div><span>최근 로그인</span><b>{member.last_sign_in_at?new Date(member.last_sign_in_at).toLocaleString('ko-KR'):'—'}</b></div><div><span>USDT 사용 가능</span><b>{Number(usdt?.available||0).toLocaleString()}</b></div><div><span>USDT 잠금</span><b>{Number(usdt?.locked||0).toLocaleString()}</b></div><div><span>활성 Loan</span><b>{activeLoans.length}</b></div></section>

    <nav className={s.tabs}>{tabs.map(([key,label])=><button key={key} className={tab===key?s.active:''} onClick={()=>setTab(key)}>{label}</button>)}</nav>

    {tab==='summary'&&<section className={s.panel}><h2>회원 요약</h2><div className={s.infoGrid}><div><span>이메일</span><b>{member.email||'—'}</b></div><div><span>전화번호</span><b>{member.phone||'—'}</b></div><div><span>권한</span><b>{member.role||'user'}</b></div><div><span>VIP</span><b>{member.vip_level||'BASIC'}</b></div><div><span>KYC</span><b>{member.kyc_status}</b></div><div><span>계정 상태</span><b>{member.frozen?'FROZEN':'ACTIVE'}</b></div></div></section>}

    {tab==='wallet'&&<section className={s.panel}><div className={s.panelHead}><h2>지갑</h2><Link href="/admin/wallet">지갑 관리 열기 →</Link></div><div className={s.table}><div className={s.th}><span>자산</span><span>사용 가능</span><span>잠금</span><span>수정일</span></div>{wallet.balances.length?wallet.balances.map((x:any)=><div className={s.tr} key={x.asset}><span><b>{x.asset}</b></span><span>{Number(x.available||0).toLocaleString()}</span><span>{Number(x.locked||0).toLocaleString()}</span><span>{x.updated_at?new Date(x.updated_at).toLocaleString('ko-KR'):'—'}</span></div>):<div className={s.empty}>지갑 데이터가 없습니다.</div>}</div></section>}

    {tab==='cashflow'&&<section className={s.split}><div className={s.panel}><div className={s.panelHead}><h2>입금</h2><Link href="/admin/wallet-ops?tab=deposits">전체 입금 관리 →</Link></div><div className={s.list}>{wallet.deposits.slice(0,20).map((x:any)=><div key={x.id}><span>{x.asset} · {x.network}</span><b>{Number(x.amount||0).toLocaleString()}</b><small>{x.status} · {new Date(x.created_at).toLocaleString('ko-KR')}</small></div>)}{!wallet.deposits.length&&<div className={s.empty}>입금 내역이 없습니다.</div>}</div></div><div className={s.panel}><div className={s.panelHead}><h2>출금</h2><Link href="/admin/wallet-ops?tab=withdrawals">전체 출금 관리 →</Link></div><div className={s.list}>{wallet.withdrawals.slice(0,20).map((x:any)=><div key={x.id}><span>{x.asset} · {x.network}</span><b>{Number(x.amount||0).toLocaleString()}</b><small>{x.status} · {new Date(x.created_at).toLocaleString('ko-KR')}</small></div>)}{!wallet.withdrawals.length&&<div className={s.empty}>출금 내역이 없습니다.</div>}</div></div></section>}

    {tab==='loan'&&<section className={s.panel}><div className={s.panelHead}><h2>Crypto Loan</h2><Link href="/admin/crypto-loan">대출관리 열기 →</Link></div><div className={s.table}><div className={`${s.th} ${s.loanCols}`}><span>Loan</span><span>원금</span><span>담보</span><span>LTV</span><span>상태</span></div>{loans.length?loans.map((x:any)=><div className={`${s.tr} ${s.loanCols}`} key={x.id}><span><b>{x.loan_no||x.id}</b></span><span>{Number(x.principal||0).toLocaleString()} {x.borrow_asset||'USDT'}</span><span>{Number(x.reserve_value_usdt||x.initial_value||0).toLocaleString()} USDT</span><span>{x.current_ltv==null?'—':(Number(x.current_ltv)*100).toFixed(2)+'%'}</span><span><b>{x.status}</b></span></div>):<div className={s.empty}>대출 내역이 없습니다.</div>}</div></section>}

    {tab==='trade'&&<section className={s.panel}><h2>거래 / 서비스 관리 바로가기</h2><p className={s.note}>거래 엔진별 기존 관리자 기능과 권한 검증은 그대로 유지합니다. 이 회원의 상세 거래 데이터는 각 기존 관리 화면에서 확인합니다.</p><div className={s.linkGrid}><Link href="/admin/futures"><UiIcon name="futures" size={18}/>Futures 관리</Link><Link href="/admin/cfd"><UiIcon name="margin" size={18}/>CFD 관리</Link><Link href="/admin/index"><UiIcon name="etf" size={18}/>ETF 관리</Link><Link href="/admin/mining"><UiIcon name="mining" size={18}/>Mining 관리</Link><Link href="/admin/ai-core"><UiIcon name="strategy" size={18}/>AI Trading</Link><Link href="/admin/copy-trading"><UiIcon name="copy" size={18}/>Copy Trading</Link><Link href="/admin/services"><UiIcon name="security" size={18}/>API / 권한 / 로그</Link></div></section>}
  </div></main>;
}
