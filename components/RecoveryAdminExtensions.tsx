'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import s from './RecoveryAdminClient.module.css';

type Dealer={id:string;code:string;owner_email:string;member_count:number;enabled:boolean};
type Wallet={id:string;email:string;is_test_account:boolean;available:number|string;locked:number|string};
type Entry={id:string;member_email:string;actor_email:string;delta:number|string;balance_after:number|string;created_at:string};
type Props={type:'dealers'|'wallets'|'ledger'};
async function api(path:string,method:'GET'|'POST'='GET',body?:unknown){
 const res=await fetch('/api/recovery-admin/'+path,{method,credentials:'same-origin',cache:'no-store',headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
 const json=await res.json().catch(()=>({error:'서버 응답 오류'}));
 if(!res.ok)throw new Error(json.error||'요청 실패');
 return json;
}
export default function RecoveryAdminExtensions({type}:Props){
 const [dealers,setDealers]=useState<Dealer[]>([]);
 const [wallets,setWallets]=useState<Wallet[]>([]);
 const [ledger,setLedger]=useState<Entry[]>([]);
 const [query,setQuery]=useState('');
 const [email,setEmail]=useState('');
 const [code,setCode]=useState('');
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');

 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   if(type==='dealers')setDealers((await api('dealers')).dealers||[]);
   if(type==='wallets')setWallets((await api('demo-wallets?q='+encodeURIComponent(query))).wallets||[]);
   if(type==='ledger')setLedger((await api('demo-ledger')).ledger||[]);
  }catch(e){setError(e instanceof Error?e.message:'조회 실패')}
  finally{setLoading(false)}
 },[type,query]);
 useEffect(()=>{void load()},[type]); // Filter search is submitted deliberately.

 async function addDealer(e:FormEvent){
  e.preventDefault();
  setLoading(true);setError('');setMessage('');
  try{
   await api('assign-dealer','POST',{email,code});
   setMessage('총판 코드를 등록했어. 해당 계정으로 총판 페이지에 접속할 수 있어.');
   setEmail('');setCode('');
   setDealers((await api('dealers')).dealers||[]);
  }catch(e){setError(e instanceof Error?e.message:'등록 실패')}
  finally{setLoading(false)}
 }
 async function setWallet(w:Wallet){
  if(!w.is_test_account)return;
  const response=window.prompt('가상 잔액 설정 (원화 표시용 테스트 수치 · 실제 USDT 아님)\n'+w.email, String(w.available));
  if(response===null)return;
  if(!/^\d+$/.test(response)||Number(response)>1000000000){setError('0부터 10억까지 정수로 입력하세요.');return}
  setLoading(true);setError('');setMessage('');
  try{
   await api('demo-wallet-set','POST',{userId:w.id,amount:Number(response),idempotencyKey:crypto.randomUUID()});
   setMessage('테스트 가상잔액과 변경 원장에 반영했어.');
   setWallets((await api('demo-wallets?q='+encodeURIComponent(query))).wallets||[]);
  }catch(e){setError(e instanceof Error?e.message:'잔액 조정 실패')}
  finally{setLoading(false)}
 }
 const amount=(v:number|string)=>Number(v||0).toLocaleString('ko-KR');
 return <div>
  {error&&<p role="alert" className={s.error}>{error}</p>}
  {message&&<p role="status" className={s.success}>{message}</p>}
  {type==='dealers'&&<>
   <section className={s.testPanel}><div><h3>총판 코드 등록</h3><p>먼저 일반 회원가입한 이메일에 총판 권한과 코드를 연결합니다. 권한은 서버에서 검증합니다.</p></div>
   <form className={s.testFields} onSubmit={addDealer}>
    <label>총판 회원 이메일<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="dealer@example.com"/></label>
    <label>총판 코드<input type="text" required minLength={3} maxLength={20} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="TEST"/></label>
    <button className={s.lime} disabled={loading}>총판 등록</button>
   </form></section>
   <div className={s.tableScroll}><table><thead><tr><th>총판 이메일</th><th>가입 코드</th><th>하위 회원</th><th>상태</th></tr></thead><tbody>{dealers.map(d=><tr key={d.id}><td>{d.owner_email}</td><td><strong>{d.code}</strong></td><td>{d.member_count}명</td><td><span className={s.normal}>{d.enabled?'활성':'정지'}</span></td></tr>)}</tbody></table>{!dealers.length&&<div className={s.empty}>등록된 총판이 없습니다.</div>}</div>
  </>}
  {type==='wallets'&&<>
   <div className={s.notice}><strong>가상잔액 전용</strong><p>이 화면은 Railway의 신규 테스트 계정용 가상잔액만 변경해. 기존 Supabase 지갑·실입출금·실거래 원장과 연결되지 않았어. 테스트 계정만 금액을 설정할 수 있어.</p></div>
   <form className={s.search} onSubmit={e=>{e.preventDefault();void load()}}><input placeholder="회원 이메일 검색" value={query} onChange={e=>setQuery(e.target.value)}/><button disabled={loading}>조회</button></form>
   <div className={s.tableScroll}><table><thead><tr><th>회원</th><th>구분</th><th>가상 사용 가능 잔액</th><th>가상 보유금</th><th>관리</th></tr></thead><tbody>{wallets.map(w=><tr key={w.id}><td>{w.email}</td><td>{w.is_test_account?'테스트':'일반'}</td><td>{amount(w.available)}</td><td>{amount(w.locked)}</td><td><button className={s.rowAction} disabled={!w.is_test_account||loading} onClick={()=>void setWallet(w)}>금액 설정</button></td></tr>)}</tbody></table>{!wallets.length&&<div className={s.empty}>검색 결과가 없습니다.</div>}</div>
  </>}
  {type==='ledger'&&<>
   <div className={s.notice}><strong>가상잔액 변경 원장</strong><p>잔액 수정 이력을 삭제·덮어쓰지 않고 시간순으로 기록합니다. 실제 입출금·거래 정산은 포함하지 않습니다.</p></div>
   <div className={s.tableScroll}><table><thead><tr><th>변경 시간</th><th>회원</th><th>처리자</th><th>변동금액</th><th>변경 후 잔액</th></tr></thead><tbody>{ledger.map(x=><tr key={x.id}><td>{new Date(x.created_at).toLocaleString('ko-KR')}</td><td>{x.member_email}</td><td>{x.actor_email}</td><td>{Number(x.delta)>0?'+':''}{amount(x.delta)}</td><td>{amount(x.balance_after)}</td></tr>)}</tbody></table>{!ledger.length&&<div className={s.empty}>변경 이력이 없습니다.</div>}</div>
  </>}
 </div>;
}
