'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import {siteConfirm} from './SiteDialog';
import s from './CfdTrading.module.css';
import o from './AdminCfdRoundOverride.module.css';

type Draft={value:string;reason:string};

export default function AdminCfdRoundOverrideClient(){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const topScroll=useRef<HTMLDivElement>(null);
  const tableScroll=useRef<HTMLDivElement>(null);
  const syncing=useRef(false);
  function syncScroll(source:'top'|'table'){
    if(syncing.current)return;
    syncing.current=true;
    const from=source==='top'?topScroll.current:tableScroll.current;
    const to=source==='top'?tableScroll.current:topScroll.current;
    if(from&&to)to.scrollLeft=from.scrollLeft;
    syncing.current=false;
  }
  const [admin,setAdmin]=useState<boolean|null>(null);
  const [rows,setRows]=useState<any[]>([]);
  const [drafts,setDrafts]=useState<Record<string,Draft>>({});
  const [msg,setMsg]=useState('');
  const [busyId,setBusyId]=useState<string|null>(null);

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    const role=user?.app_metadata?.role;
    const ok=role==='admin'||role==='superadmin'||user?.app_metadata?.superadmin===true;
    setAdmin(ok);
    if(!ok)return;
    const {data,error}=await supabase.rpc('admin_get_cfd_dashboard');
    if(error){setMsg(error.message);return}
    setRows((data as any)?.timed_trades||[]);
  }

  useEffect(()=>{load();const id=setInterval(load,2000);return()=>clearInterval(id)},[]);

  async function apply(t:any){
    if(t.status!=='ACTIVE'){setMsg('이미 최종 판정이 확정된 회차는 수정할 수 없습니다.');return}
    const d=drafts[t.id]||{value:t.override_value||'AUTO',reason:t.override_reason||''};
    if(d.reason.trim().length<5){setMsg('보정 사유를 5자 이상 입력하세요.');return}
    const label=d.value==='AUTO'?'자동 판정':d.value==='WIN'?'WIN 보정':d.value==='LOSS'?'LOSE 보정':'무효 처리';
    const ok=await siteConfirm(
      `${t.symbol} · ${String(t.id).slice(0,8)}…\n${label}을 이 회차에 적용할까요?\n\n정산 완료 전 회차에만 적용됩니다.`,
      {title:'CFD 회차 판정 보정'}
    );
    if(!ok)return;
    setBusyId(t.id);setMsg('');
    const {error}=await supabase.rpc('admin_set_cfd_timed_round_override',{
      p_trade_id:t.id,p_override:d.value,p_reason:d.reason.trim()
    });
    setBusyId(null);
    if(error){setMsg(error.message);return}
    setMsg('회차 판정 보정이 즉시 저장되었습니다.');
    setDrafts(v=>{const n={...v};delete n[t.id];return n});
    await load();
  }

  if(admin===null)return <main className={s.page}><div className={s.shell}><p>관리자 권한 확인 중...</p></div></main>;
  if(!admin)return <main className={s.page}><div className={s.shell}><p>관리자 권한이 필요합니다.</p></div></main>;

  return <main className={s.page}>
    <section className={`${s.shell} ${s.hero}`}>
      <div>
        <span className={s.eyebrow}>ADMIN · CFD ROUND CONTROL</span>
        <h1>CFD 회차 판정 보정</h1>
        <p>정산 완료 전 ACTIVE 회차에 한해 자동 판정, WIN, LOSE, 무효 처리 값을 지정합니다. 변경 내역은 관리자 감사 로그에만 기록됩니다.</p>
      </div>
      <div className={s.status}><span className={s.pill}>LIVE REFRESH · 2s</span><span className={s.pill}>{rows.filter(x=>x.status==='ACTIVE').length} ACTIVE</span></div>
    </section>

    {msg&&<section className={s.shell}><div className={s.warning}>{msg}</div></section>}

    <section className={`${s.shell} ${s.section}`}>
      <div className={s.panel}>
        <div className={s.panelHead}><b>회차 목록</b><span>최근 {rows.length}건</span></div>
        <div className={o.scrollGuide}>좌우로 이동하여 오른쪽의 ‘즉시 적용’ 버튼을 확인하세요.</div>
        <div className={o.topScrollbar} ref={topScroll} onScroll={()=>syncScroll('top')} aria-label="CFD 판정보정 표 가로 스크롤" role="region" tabIndex={0}><div style={{width:1750,height:1}} /></div>
        <div className={`${s.tableWrap} ${o.tableScroll}`} ref={tableScroll} onScroll={()=>syncScroll('table')}>
          <table className={s.table} style={{minWidth:1750}}>
            <thead><tr>
              <th>회차 ID</th><th>회원</th><th>종목</th><th>상태</th><th>시작 시간</th><th>종료 시간</th>
              <th>시작 기준가격</th><th>종료 기준가격</th><th>자동 판정</th><th>관리자 보정값</th>
              <th>최종 적용 결과</th><th>보정 사유</th><th>처리 관리자</th><th>처리 시간</th><th className={o.actionCell}>적용</th>
            </tr></thead>
            <tbody>
              {rows.length?rows.map(t=>{
                const d=drafts[t.id]||{value:t.override_value||'AUTO',reason:t.override_reason||''};
                const final=t.status==='SETTLED'
                  ?(t.result==='VOID'?'무효':t.result)
                  :(d.value==='AUTO'?'자동 판정 예정':d.value==='LOSS'?'LOSS':d.value==='VOID'?'무효':d.value);
                return <tr key={t.id}>
                  <td title={t.id}>{String(t.id).slice(0,8)}…</td>
                  <td>{t.email||String(t.user_id).slice(0,8)+'…'}</td>
                  <td><b>{t.symbol}</b></td>
                  <td>{t.status}</td>
                  <td>{new Date(t.starts_at).toLocaleString('ko-KR')}</td>
                  <td>{new Date(t.expires_at).toLocaleString('ko-KR')}</td>
                  <td>{Number(t.start_price).toLocaleString(undefined,{maximumFractionDigits:8})}</td>
                  <td>{t.end_price==null?'—':Number(t.end_price).toLocaleString(undefined,{maximumFractionDigits:8})}</td>
                  <td>{t.auto_result||'판정 대기'}</td>
                  <td>
                    <select disabled={t.status!=='ACTIVE'||busyId===t.id} value={d.value}
                      onChange={e=>setDrafts(v=>({...v,[t.id]:{value:e.target.value,reason:(v[t.id]?.reason??t.override_reason??'')}}))}>
                      <option value="AUTO">자동 판정</option>
                      <option value="WIN">WIN 보정</option>
                      <option value="LOSS">LOSE 보정</option>
                      <option value="VOID">무효 처리</option>
                    </select>
                  </td>
                  <td><b>{final}</b></td>
                  <td>{t.status==='ACTIVE'
                    ?<input disabled={busyId===t.id} value={d.reason} placeholder="보정 사유 5자 이상"
                      onChange={e=>setDrafts(v=>({...v,[t.id]:{value:(v[t.id]?.value??t.override_value??'AUTO'),reason:e.target.value}}))}/>
                    :(t.override_reason||'—')}</td>
                  <td>{t.override_admin_email||'—'}</td>
                  <td>{t.override_at?new Date(t.override_at).toLocaleString('ko-KR'):'—'}</td>
                  <td className={o.actionCell}>{t.status==='ACTIVE'
                    ?<button className={s.ghost} disabled={busyId===t.id} onClick={()=>apply(t)}>{busyId===t.id?'적용 중':'즉시 적용'}</button>
                    :<span>확정</span>}</td>
                </tr>
              }):<tr><td colSpan={15} className={s.empty}>표시할 CFD 회차가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </main>;
}
