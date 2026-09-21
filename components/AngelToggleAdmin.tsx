'use client';

import {useEffect,useMemo,useState} from 'react';
import s from './AngelToggleAdmin.module.css';

type Product={id:string;name:string;duration_days:number;max_devices:number};
type License={
  id:string;code_prefix:string;duration_days:number;max_devices:number;
  customer_name:string|null;status:string;activated_at:string|null;expires_at:string|null;
  angeltoggle_license_products?:{name?:string}|null;
};
type Data={
  counts:{total:number;active:number;unused:number;suspended:number;expiring:number};
  products:Product[];
  licenses:License[];
};

function fmt(v:string|null){if(!v)return '-';return new Date(v).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}

export default function AngelToggleAdmin(){
  const [data,setData]=useState<Data|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [codes,setCodes]=useState<string[]>([]);

  async function request(body?:any){
    const res=await fetch('/api/admin/angeltoggle',{
      method:body?'POST':'GET',
      headers:body?{'content-type':'application/json'}:undefined,
      body:body?JSON.stringify(body):undefined,
      cache:'no-store',
    });
    const json=await res.json();
    if(!res.ok)throw new Error(json?.error||'요청 실패');
    setData(json);
    return json;
  }

  useEffect(()=>{request().catch(e=>setError(e.message))},[]);

  async function generate(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('');
    const fd=new FormData(e.currentTarget);
    try{
      const json=await request({
        action:'generate',
        product_id:fd.get('product_id'),
        quantity:Number(fd.get('quantity')||1),
        customer_name:fd.get('customer_name'),
        customer_contact:fd.get('customer_contact'),
        memo:fd.get('memo'),
      });
      setCodes(json.codes||[]);
      e.currentTarget.reset();
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }

  async function act(id:string,command:string){
    if(command==='revoke'&&!confirm('이 라이선스를 폐기할까요?'))return;
    setBusy(true);setError('');
    try{await request({action:'license_action',id,command})}
    catch(e:any){setError(e.message)}finally{setBusy(false)}
  }

  return <main className={s.page}>
    <div className={s.head}>
      <div><span>C:\BITMATE\ADMIN&gt; ANGELTOGGLE</span><h1>엔젤토글 판매관리</h1><p>기간코드 · PC 인증 · 만료 · 정지 · 기기 초기화</p></div>
      <button onClick={()=>request().catch(e=>setError(e.message))}>새로고침</button>
    </div>

    {error&&<div className={s.error}>{error}</div>}

    <section className={s.cards}>
      <article><span>전체 라이선스</span><b>{data?.counts.total??0}</b></article>
      <article><span>사용중</span><b>{data?.counts.active??0}</b></article>
      <article><span>미사용 코드</span><b>{data?.counts.unused??0}</b></article>
      <article><span>정지</span><b>{data?.counts.suspended??0}</b></article>
      <article><span>7일 이내 만료</span><b>{data?.counts.expiring??0}</b></article>
    </section>

    <section className={s.panel}>
      <div className={s.command}>C:\BITMATE\ADMIN&gt; 기간코드 발급</div>
      <h2>라이선스 코드 발급</h2>
      <form onSubmit={generate} className={s.form}>
        <select name="product_id" required defaultValue="">
          <option value="" disabled>상품 선택</option>
          {(data?.products||[]).map(p=><option key={p.id} value={p.id}>{p.name} · {p.duration_days}일 · {p.max_devices}PC</option>)}
        </select>
        <input name="quantity" type="number" min="1" max="100" defaultValue="1"/>
        <input name="customer_name" placeholder="고객명"/>
        <input name="customer_contact" placeholder="연락처 / 텔레그램"/>
        <input name="memo" placeholder="메모"/>
        <button disabled={busy}>코드 발급</button>
      </form>
      {codes.length>0&&<div className={s.codes}><strong>발급된 코드 — 이 화면에서만 원문 확인</strong><pre>{codes.join('\n')}</pre></div>}
    </section>

    <section className={s.panel}>
      <div className={s.command}>C:\BITMATE\ADMIN&gt; 라이선스 목록</div>
      <h2>최근 라이선스</h2>
      <div className={s.tableWrap}>
        <table>
          <thead><tr><th>코드</th><th>상품</th><th>고객</th><th>상태</th><th>활성화</th><th>만료</th><th>PC</th><th>관리</th></tr></thead>
          <tbody>{(data?.licenses||[]).map(l=><tr key={l.id}>
            <td>{l.code_prefix}••••</td>
            <td>{l.angeltoggle_license_products?.name||l.duration_days+'일'}</td>
            <td>{l.customer_name||'-'}</td>
            <td><span className={s.status}>{l.status}</span></td>
            <td>{fmt(l.activated_at)}</td>
            <td>{fmt(l.expires_at)}</td>
            <td>{l.max_devices}</td>
            <td><div className={s.actions}>
              {l.status==='SUSPENDED'
                ?<button onClick={()=>act(l.id,'resume')} disabled={busy}>재개</button>
                :<button onClick={()=>act(l.id,'suspend')} disabled={busy}>정지</button>}
              <button onClick={()=>act(l.id,'extend30')} disabled={busy}>+30일</button>
              <button onClick={()=>act(l.id,'reset_devices')} disabled={busy}>기기초기화</button>
              <button className={s.danger} onClick={()=>act(l.id,'revoke')} disabled={busy}>폐기</button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </main>;
}
