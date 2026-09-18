'use client';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import s from './BtmtMembership.module.css';

type Tier={id:string;code:string;name:string;required_btmt:number;reward_rate:number;valid_months:number;sort_order:number};
type Settings={btmt_price_usdt:number;support_email:string|null};
type Membership={id:string;staked_btmt:number;reward_rate:number;status:string;started_at:string;expires_at:string|null;tier_id:string};
type AppRow={id:string;status:string;created_at:string;tier_id:string;btmt_amount:number;usdt_equivalent:number};
const fmt=(n:number,d=2)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:d}).format(Number(n||0));

export default function BtmtMembershipClient(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]); const router=useRouter();
 const [ready,setReady]=useState(false); const [userEmail,setUserEmail]=useState(''); const [tiers,setTiers]=useState<Tier[]>([]); const [settings,setSettings]=useState<Settings>({btmt_price_usdt:.6,support_email:null}); const [membership,setMembership]=useState<Membership|null>(null); const [balance,setBalance]=useState(0); const [apps,setApps]=useState<AppRow[]>([]);
 const [selected,setSelected]=useState<Tier|null>(null); const [form,setForm]=useState({full_name:'',email:'',phone:'',messenger:'',country:'',notes:''}); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
 async function load(){
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){router.replace('/login?next=/more/btmt-membership');return;}
   setUserEmail(user.email||''); setForm(x=>({...x,email:user.email||x.email}));
   const [{data:t},{data:st},{data:m},{data:b},{data:a}]=await Promise.all([
     supabase.from('btmt_membership_tiers').select('id,code,name,required_btmt,reward_rate,valid_months,sort_order').eq('active',true).order('sort_order'),
     supabase.from('btmt_membership_settings').select('btmt_price_usdt,support_email').eq('id',true).maybeSingle(),
     supabase.from('btmt_memberships').select('id,staked_btmt,reward_rate,status,started_at,expires_at,tier_id').eq('status','ACTIVE').maybeSingle(),
     supabase.from('btmt_reward_balances').select('accrued_usdt').maybeSingle(),
     supabase.from('btmt_membership_applications').select('id,status,created_at,tier_id,btmt_amount,usdt_equivalent').order('created_at',{ascending:false}).limit(10)
   ]);
   setTiers((t||[]) as Tier[]); if(st)setSettings(st as Settings); setMembership((m||null) as Membership|null); setBalance(Number((b as any)?.accrued_usdt||0)); setApps((a||[]) as AppRow[]); setReady(true);
 }
 useEffect(()=>{load()},[]);
 async function submit(){
   if(!selected)return; if(!form.full_name.trim()||!form.email.trim()){setMsg('이름과 이메일을 입력해 주세요.');return;}
   setBusy(true);setMsg('');
   const {error}=await supabase.rpc('submit_btmt_membership_application',{p_tier:selected.id,p_full_name:form.full_name,p_email:form.email,p_phone:form.phone||null,p_messenger:form.messenger||null,p_country:form.country||null,p_notes:form.notes||null});
   setBusy(false);
   if(error){setMsg(error.message);return;}
   setMsg('멤버십 신청이 고객센터에 접수되었습니다.');
   const subject=`BTMT Membership ${selected.name} 신청`;
   const body=`이름: ${form.full_name}\n이메일: ${form.email}\n전화: ${form.phone}\n메신저: ${form.messenger}\n국가: ${form.country}\n신청 등급: ${selected.name}\nBTMT 수량: ${fmt(selected.required_btmt,0)} BTMT\nUSDT 환산: ${fmt(selected.required_btmt*Number(settings.btmt_price_usdt),2)} USDT\n비고: ${form.notes}`;
   if(settings.support_email) window.location.href=`mailto:${encodeURIComponent(settings.support_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
   await load(); setTimeout(()=>setSelected(null),700);
 }
 if(!ready)return <main className={s.page}><div className={s.loading}>Loading membership...</div></main>;
 const activeTier=membership?tiers.find(t=>t.id===membership.tier_id):null;
 return <main className={s.page}>
   <section className={s.hero}><div className={s.shell}><div className={s.heroGrid}><div><span className={s.eyebrow}>BTMT PREMIUM MEMBERSHIP</span><h1>BTMT를 스테이킹하고<br/>거래금액 리워드를 적립하세요.</h1><p>멤버십 등급에 따라 거래금액의 <b>0.2%부터 최대 1.0%</b>가 USDT 기준 리워드로 적립됩니다. 수수료 할인 대신 실제 거래금액 기준 적립 구조로 운영됩니다.</p><div className={s.heroMeta}><span>BTMT 기준가 <b>1 BTMT = {fmt(settings.btmt_price_usdt,2)} USDT</b></span><span>로그인 계정 전용</span><span>체결 거래금액 기준 적립</span></div></div><div className={s.accountCard}><small>MY MEMBERSHIP</small>{activeTier?<><strong>{activeTier.name}</strong><p>{fmt(membership!.staked_btmt,0)} BTMT · {(membership!.reward_rate*100).toFixed(1)}% 적립</p><div className={s.rewardBox}><span>누적 적립금</span><b>{fmt(balance,4)} USDT</b></div></>:<><strong>Membership Ready</strong><p>{userEmail}</p><div className={s.rewardBox}><span>누적 적립금</span><b>{fmt(balance,4)} USDT</b></div></>}</div></div></div></section>
   <section className={s.body}><div className={s.shell}>
     <div className={s.intro}><h2>BTMT 멤버십 레벨</h2><p>등급별 요구 BTMT 수량과 거래금액 적립률을 확인하세요.</p></div>
     <div className={s.tierGrid}>{tiers.map(t=><article className={s.tier} key={t.id}><div className={s.tierHead}><span className={s.medal}>◆</span><h3>{t.name}</h3></div><strong className={s.amount}>{fmt(t.required_btmt,0)} BTMT</strong><span className={s.usdt}>{fmt(t.required_btmt*Number(settings.btmt_price_usdt),0)} USDT 상당</span><button className={s.stakeBtn} onClick={()=>{setSelected(t);setMsg('')}}>스테이킹하기</button><ul><li><span>거래금액 적립률</span><b>{(Number(t.reward_rate)*100).toFixed(1)}%</b></li><li><span>혜택 유효기간</span><b>{t.valid_months}개월</b></li><li><span>적립 기준</span><b>체결 거래금액</b></li><li><span>적립 단위</span><b>USDT</b></li></ul></article>)}</div>
     <section className={s.how}><h2>BTMT 회원이 되어 혜택을 누리는 방법</h2><div className={s.howGrid}>{[['01','멤버십 선택','원하는 등급과 필요한 BTMT 수량을 확인합니다.'],['02','고객센터 신청','스테이킹하기를 눌러 본인 정보와 연락처를 제출합니다.'],['03','가입 확인','운영팀이 신청 내용을 확인하고 멤버십을 승인합니다.'],['04','거래 리워드 적립','승인된 등급의 적립률이 거래금액에 자동 적용됩니다.']].map(([n,t,d])=><div key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></div>)}</div></section>
     {apps.length>0&&<section className={s.history}><h2>신청 내역</h2>{apps.map(a=><div key={a.id}><span>{new Date(a.created_at).toLocaleDateString()}</span><b>{tiers.find(t=>t.id===a.tier_id)?.name||'BTMT Membership'}</b><span>{fmt(a.btmt_amount,0)} BTMT</span><strong>{a.status}</strong></div>)}</section>}
     <section className={s.faq}><h2>자주 묻는 질문</h2><details open><summary>거래금액 적립은 어떻게 계산되나요?</summary><p>회원 등급의 적립률을 USDT 환산 체결 거래금액에 적용합니다. 예를 들어 0.6% 등급에서 10,000 USDT의 적립 대상 거래가 확정되면 60 USDT가 리워드로 적립됩니다.</p></details><details><summary>BTMT 가격은 얼마인가요?</summary><p>현재 멤버십 산정 기준가는 1 BTMT = {fmt(settings.btmt_price_usdt,2)} USDT입니다. 멤버십 신청 시 표시된 기준가가 신청 내역에 적용됩니다.</p></details><details><summary>스테이킹 신청은 어떻게 처리되나요?</summary><p>스테이킹 신청이 승인되면 해당 등급의 멤버십 혜택이 활성화됩니다.</p></details></section>
   </div></section>
   {selected&&<div className={s.modal}><div className={s.modalCard}><div className={s.modalHead}><div><small>BTMT MEMBERSHIP APPLICATION</small><h2>{selected.name} 스테이킹 신청</h2></div><button onClick={()=>setSelected(null)}>×</button></div><div className={s.quote}><div><span>신청 수량</span><b>{fmt(selected.required_btmt,0)} BTMT</b></div><div><span>기준가</span><b>{fmt(settings.btmt_price_usdt,2)} USDT</b></div><div><span>환산금액</span><b>{fmt(selected.required_btmt*Number(settings.btmt_price_usdt),2)} USDT</b></div><div><span>거래 적립률</span><b>{(selected.reward_rate*100).toFixed(1)}%</b></div></div><div className={s.formGrid}><label>이름<input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label><label>이메일<input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>전화번호<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Telegram / 메신저<input value={form.messenger} onChange={e=>setForm({...form,messenger:e.target.value})}/></label><label>국가<input value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></label><label className={s.full}>비고<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div><div className={s.mailNotice}>신청이 접수되면 진행 상태를 안내해드립니다.{settings.support_email?'':''}</div>{msg&&<p className={msg.includes('접수')?s.success:s.error}>{msg}</p>}<button className={s.submit} disabled={busy} onClick={submit}>{busy?'접수 중...':'고객센터에 신청서 보내기'}</button></div></div>}
 </main>
}
