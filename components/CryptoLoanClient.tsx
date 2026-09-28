'use client';

import {siteConfirm} from './SiteDialog';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import {useUnifiedWalletDisplay} from '@/lib/useUnifiedWalletDisplay';
import s from './CryptoLoan.module.css';

type Product={
  id:string;name:string;description:string|null;borrow_asset:string;collateral_asset:string;
  term_mode:'FLEXIBLE'|'FIXED';term_days:number|null;max_ltv:number;base_interest_rate:number;
  overdue_interest_rate:number;interest_rate_type:string;extension_allowed:boolean;
  allowed_collateral_assets:string[];min_borrow:number;max_borrow:number|null;
};
type CollateralOption={asset:string;available:number;locked:number;total:number;price:number;available_value:number;max_borrow:number};
type Quote={
  product_id:string;collateral_asset:string;collateral_quantity:number;collateral_price:number;
  collateral_value:number;max_ltv:number;max_borrow:number;principal:number;base_interest_rate:number;
  overdue_interest_rate:number;interest_rate_type:string;term_days:number;estimated_interest:number;
  total_repayment_amount:number;due_at:string;
};
type Loan={
  id:string;loan_no:string;product_id:string;borrow_asset:string;collateral_asset:string;principal:number;
  collateral_quantity:number;collateral_price_at_request:number;collateral_value_at_request:number;
  current_collateral_price:number|null;current_collateral_value:number|null;current_ltv:number|null;
  interest_rate:number|null;overdue_interest_rate:number|null;interest_amount:number;total_repayment_amount:number;
  repaid_principal:number;repaid_interest:number;status:string;funded_at:string|null;due_at:string|null;
  created_at:string;extension_requested_at:string|null;
};
type Collateral={id:string;loan_id:string;asset_symbol:string;quantity:number;initial_price:number;initial_value:number;current_price:number|null;current_value:number|null;status:string};
type Extension={id:string;loan_id:string;old_due_at:string;new_due_at:string|null;old_interest_rate:number;new_interest_rate:number|null;additional_interest:number|null;admin_note:string|null;status:string;requested_at:string;accepted_at:string|null};

const qtyFmt=(n:number,d=8)=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:d});
const pct=(n:number|null|undefined)=>n==null?'—':`${(Number(n)*100).toFixed(2)}%`;

const statusLabel:Record<string,string>={
  PENDING:'신청 대기',APPROVED:'승인 완료',ACTIVE:'정상 진행중',
  EXTENSION_REQUESTED:'연장 신청',EXTENSION_OFFERED:'연장 조건 확인',
  EXTENDED:'연장 완료',OVERDUE_REVIEW:'만기 협의',OVERDUE:'연체',
  REPAID:'상환 완료',COLLATERAL_SEIZED:'담보 회수',CANCELLED:'취소',REJECTED:'거절'
};

export default function CryptoLoanClient(){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const wallet=useUnifiedWalletDisplay();

  const [products,setProducts]=useState<Product[]>([]);
  const [loans,setLoans]=useState<Loan[]>([]);
  const [collaterals,setCollaterals]=useState<Collateral[]>([]);
  const [extensions,setExtensions]=useState<Extension[]>([]);
  const [logged,setLogged]=useState(false);
  const [loading,setLoading]=useState(true);

  const [selected,setSelected]=useState<Product|null>(null);
  const [options,setOptions]=useState<CollateralOption[]>([]);
  const [asset,setAsset]=useState('');
  const [collateralQty,setCollateralQty]=useState('');
  const [principal,setPrincipal]=useState('');
  const [quote,setQuote]=useState<Quote|null>(null);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');
  const [agree,setAgree]=useState(false);
  const [step,setStep]=useState(2);

  async function load(){
    setLoading(true);
    const [{data:p},{data:{user}}]=await Promise.all([
      supabase.from('crypto_loan_products').select('id,name,description,borrow_asset,collateral_asset,term_mode,term_days,max_ltv,base_interest_rate,overdue_interest_rate,interest_rate_type,extension_allowed,allowed_collateral_assets,min_borrow,max_borrow').eq('status','ACTIVE').eq('visible',true).order('sort_order'),
      supabase.auth.getUser()
    ]);
    setProducts((p||[]) as Product[]);
    setLogged(!!user);

    if(user){
      const [{data:l},{data:c},{data:e}]=await Promise.all([
        supabase.from('crypto_loans').select('id,loan_no,product_id,borrow_asset,collateral_asset,principal,collateral_quantity,collateral_price_at_request,collateral_value_at_request,current_collateral_price,current_collateral_value,current_ltv,interest_rate,overdue_interest_rate,interest_amount,total_repayment_amount,repaid_principal,repaid_interest,status,funded_at,due_at,created_at,extension_requested_at').order('created_at',{ascending:false}).limit(50),
        supabase.from('crypto_loan_collaterals').select('*').order('created_at',{ascending:false}).limit(50),
        supabase.from('crypto_loan_extensions').select('*').order('created_at',{ascending:false}).limit(50)
      ]);
      setLoans((l||[]) as Loan[]);
      setCollaterals((c||[]) as Collateral[]);
      setExtensions((e||[]) as Extension[]);
    }else{
      setLoans([]);setCollaterals([]);setExtensions([]);
    }
    setLoading(false);
  }

  useEffect(()=>{load();const id=setInterval(load,15000);return()=>clearInterval(id)},[]);

  const money=(usdt:number|null|undefined)=>wallet.withUnit(Number(usdt||0));

  async function openApply(p:Product){
    setSelected(p);setQuote(null);setMsg('');setAgree(false);setStep(2);setCollateralQty('');setPrincipal('');
    if(!logged){setOptions([]);return}
    const {data,error}=await supabase.rpc('get_crypto_loan_collateral_options',{p_product:p.id});
    if(error){console.error('get_crypto_loan_collateral_options',error);setMsg('담보 가능 자산을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');return}
    const rows=((data as any)?.assets||[]) as CollateralOption[];
    setOptions(rows);
    const first=rows[0];
    setAsset(first?.asset||'');
    if(first){
      const suggested=Math.min(Number(first.available||0),Number(first.available||0));
      setCollateralQty(suggested>0?String(suggested):'');
      setPrincipal(String(Math.max(Number(p.min_borrow||0),10)));
    }
  }

  const selectedOption=options.find(x=>x.asset===asset)||null;

  async function calc(){
    if(!selected||!asset)return;
    const q=Number(collateralQty),p=Number(principal);
    if(!Number.isFinite(q)||q<=0){setMsg('담보 수량을 확인해주세요.');return}
    if(!Number.isFinite(p)||p<=0){setMsg('대출 신청금액을 확인해주세요.');return}
    setBusy(true);setMsg('');
    const {data,error}=await supabase.rpc('get_crypto_loan_quote_v2',{
      p_product:selected.id,p_collateral_asset:asset,p_collateral_quantity:q,p_principal:p
    });
    setBusy(false);
    if(error){console.error('get_crypto_loan_quote_v2',error);setMsg(error.message.includes('LTV_LIMIT')?'최대 대출 가능금액을 초과했습니다.':'대출 조건 계산 중 오류가 발생했습니다. 입력값을 확인해주세요.');return}
    setQuote(data as Quote);setStep(3);
  }

  async function apply(){
    if(!selected||!quote||!agree)return;
    setBusy(true);setMsg('');
    const {error}=await supabase.rpc('apply_crypto_loan_v2',{
      p_product:selected.id,
      p_collateral_asset:quote.collateral_asset,
      p_collateral_quantity:Number(collateralQty),
      p_principal:Number(principal),
      p_idempotency_key:`loan:${crypto.randomUUID()}`
    });
    setBusy(false);
    if(error){console.error('apply_crypto_loan_v2',error);setMsg('대출 신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');return}
    setStep(4);setMsg('대출 신청이 접수되었습니다. 현재 상태는 승인 대기이며, 관리자 승인 후에만 대출금이 자산에 반영됩니다. 신청 담보가치는 승인 대기 중 출금 제한으로 예약됩니다.');
    await load();
  }

  async function repay(l:Loan){
    const due=Math.max(Number(l.principal)-Number(l.repaid_principal||0),0)+Math.max(Number(l.interest_amount)-Number(l.repaid_interest||0),0);
    const ok=await siteConfirm(`현재 상환 예정금액 ${money(due)}를 상환하고 담보 LOCK을 해제할까요?`,{title:'대출 상환'});
    if(!ok)return;
    setBusy(true);setMsg('');
    const {error}=await supabase.rpc('repay_crypto_loan_now',{p_loan:l.id,p_idempotency_key:`repay:${crypto.randomUUID()}`});
    setBusy(false);
    if(error){console.error('repay_crypto_loan_now',error);setMsg(error.message.includes('INSUFFICIENT_BALANCE')?'사용 가능한 잔액이 부족합니다.':'상환 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');return}
    setMsg('상환이 완료되었고 담보 LOCK이 해제되었습니다.');await load();
  }

  async function requestExtension(l:Loan){
    const ok=await siteConfirm('기간 연장을 신청할까요? 관리자가 새로운 기간과 이자율을 제시한 뒤 회원 동의가 있어야 연장이 확정됩니다.',{title:'기간 연장 신청'});
    if(!ok)return;
    setBusy(true);setMsg('');
    const {error}=await supabase.rpc('request_crypto_loan_extension_v2',{p_loan:l.id});
    setBusy(false);
    if(error){console.error('request_crypto_loan_extension_v2',error);setMsg('기간 연장 신청을 처리하지 못했습니다. 현재 대출 상태를 확인해주세요.');return}
    setMsg('기간 연장 신청이 접수되었습니다.');await load();
  }

  async function acceptExtension(ext:Extension){
    const rate=pct(ext.new_interest_rate);
    const add=money(Number(ext.additional_interest||0));
    const ok=await siteConfirm(`새 상환일: ${ext.new_due_at?new Date(ext.new_due_at).toLocaleString('ko-KR'):'—'}\n변경 이자율: ${rate}\n추가 이자: ${add}\n\n이 조건에 동의하고 기간을 연장할까요?`,{title:'연장 조건 동의'});
    if(!ok)return;
    setBusy(true);setMsg('');
    const {error}=await supabase.rpc('accept_crypto_loan_extension',{p_extension:ext.id});
    setBusy(false);
    if(error){console.error('accept_crypto_loan_extension',error);setMsg('연장 조건 적용 중 오류가 발생했습니다.');return}
    setMsg('기간 연장이 완료되었습니다.');await load();
  }

  return <main className={s.page}>
    <section className={s.hero}><div className={s.shell}><div className={s.heroGrid}><div>
      <span className={s.kicker}>CRYPTO COLLATERAL LOAN</span>
      <h1 className={s.title}>보유 자산을 팔지 않고<br/>유동성을 확보하세요.</h1>
      <p className={s.lead}>보유 암호화폐를 담보로 설정하고 담보 평가금액의 최대 80%까지 이용할 수 있습니다. 담보는 대출이 종료될 때까지 LOCK됩니다.</p>
      <div className={s.badges}>{['담보 평가금액 최대 80%','기본 7일','기본 이자 1%','기간 연장 가능'].map(x=><span className={s.badge} key={x}><i className={s.dot}>✓</i>{x}</span>)}</div>
    </div><div className={s.loginBox}>{logged?<><strong>내 대출 현황</strong><p>대출 원금, 담보 가치, 현재 LTV, 상환일과 연장 상태를 확인할 수 있습니다.</p><Link className={s.primary} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',textDecoration:'none'}} href="#my-loans">내 대출 보기</Link></>:<><strong>보유 자산으로 대출을 신청하려면 로그인하세요.</strong><p>로그인 후 실제 보유 중인 담보 가능 자산이 표시됩니다.</p><Link className={s.primary} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',textDecoration:'none'}} href="/login">Log in</Link></>}</div></div></div></section>

    <section className={s.body}><div className={s.shell}>
      <div className={s.steps}>{[['01','상품 선택'],['02','담보 및 금액'],['03','조건 확인'],['04','대출 실행']].map(([n,t])=><div className={s.step} key={n}><span className={s.stepNum}>{n}</span><b>{t}</b></div>)}</div>

      <h2 className={s.sectionTitle}>대출 시장</h2>
      <div className={s.market}>
        <div className={s.marketHead}><span>상품</span><span>최대 LTV</span><span>기간 / 기본 이자</span><span>연장 / 연체</span><span>실행</span></div>
        {products.length?products.map(p=><div className={s.row} key={p.id}>
          <div><div className={s.asset}>{p.name}</div><span className={s.muted}>{p.description||'보유 코인을 담보로 이용하는 대출 상품'}</span></div>
          <div><b>{pct(p.max_ltv)}</b><span className={s.muted}> 담보 평가금액 기준</span></div>
          <div><b>{p.term_days||7}일 · {pct(p.base_interest_rate)}</b><span className={s.muted}> {p.interest_rate_type==='FIXED_TERM'?'기간 전체 고정':'상품 기준'}</span></div>
          <div><b>{p.extension_allowed?'연장 가능':'연장 불가'}</b><span className={s.muted}> · 연체 {pct(p.overdue_interest_rate)} / 담당자 협의</span></div>
          <button className={s.applyBtn} onClick={()=>openApply(p)}>대출 신청</button>
        </div>):<div style={{padding:28,color:'#838b90'}}>현재 이용 가능한 대출 상품이 없습니다.</div>}
      </div>

      {logged&&<section id="my-loans" className={s.loans}>
        <h2 className={s.sectionTitle}>내 대출</h2>
        {loans.length?loans.map(l=>{
          const c=collaterals.find(x=>x.loan_id===l.id);
          const ext=extensions.find(x=>x.loan_id===l.id&&['REQUESTED','OFFERED'].includes(x.status));
          const outstanding=Math.max(Number(l.principal)-Number(l.repaid_principal||0),0)+Math.max(Number(l.interest_amount)-Number(l.repaid_interest||0),0);
          const due=l.due_at?new Date(l.due_at):null;
          const remain=due?Math.ceil((due.getTime()-Date.now())/86400000):null;
          return <div className={s.loanCard} key={l.id}>
            <div className={s.loanTop}><div><b>{l.loan_no}</b><span className={s.muted} style={{display:'block'}}>{l.collateral_asset} 담보 · {l.borrow_asset} 대출</span></div><span className={s.status}>{statusLabel[l.status]||l.status}</span></div>
            <div className={s.loanGrid}>
              <div><small>대출금액</small><b>{money(l.principal)}</b></div>
              <div><small>담보자산 / 수량</small><b>{l.collateral_asset} · {qtyFmt(l.collateral_quantity)}</b></div>
              <div><small>담보 시작가격</small><b>{money(l.collateral_price_at_request)}</b></div>
              <div><small>현재 담보가격</small><b>{money(l.current_collateral_price??l.collateral_price_at_request)}</b></div>
              <div><small>대출 당시 담보가치</small><b>{money(l.collateral_value_at_request)}</b></div>
              <div><small>현재 담보가치</small><b>{money(l.current_collateral_value??l.collateral_value_at_request)}</b></div>
              <div><small>현재 LTV</small><b>{pct(l.current_ltv)}</b></div>
              <div><small>적용 이자율</small><b>{pct(l.interest_rate)}</b></div>
              <div><small>예상 이자</small><b>{money(l.interest_amount)}</b></div>
              <div><small>총 상환예정금액</small><b>{money(outstanding)}</b></div>
              <div><small>대출 실행일</small><b>{l.funded_at?new Date(l.funded_at).toLocaleDateString('ko-KR'):'승인 대기'}</b></div>
              <div><small>상환 예정일</small><b>{due?due.toLocaleDateString('ko-KR'):'—'}</b></div>
              <div><small>남은 기간</small><b>{remain==null?'—':remain>=0?`${remain}일`:'만기 도달'}</b></div>
              <div><small>담보 상태</small><b>{c?.status==='RESERVED'?'출금제한 예약':c?.status==='ACTIVE'?'출금제한 활성':c?.status==='RELEASED'?'제한 해제':c?.status==='SEIZED'?'담보 회수':c?.status||'—'}</b></div>
            </div>
            {ext?.status==='OFFERED'&&<div className={s.extensionOffer}><b>연장 조건 제안</b><span>새 만기 {ext.new_due_at?new Date(ext.new_due_at).toLocaleDateString('ko-KR'):'—'} · 변경 이자율 {pct(ext.new_interest_rate)} · 추가 이자 {money(Number(ext.additional_interest||0))}</span><button className={s.primary} disabled={busy} onClick={()=>acceptExtension(ext)}>조건 동의 및 연장</button></div>}
            <div className={s.loanActions}>
              {l.status==='PENDING'&&<span className={s.muted}>관리자 승인 후 대출금이 자산에 반영됩니다.</span>}{['ACTIVE','EXTENDED','EXTENSION_REQUESTED','EXTENSION_OFFERED','OVERDUE_REVIEW','OVERDUE'].includes(l.status)&&<button className={s.secondary} disabled={busy} onClick={()=>repay(l)}>상환하기</button>}
              {['ACTIVE','EXTENDED'].includes(l.status)&&due&&due.getTime()>Date.now()&&<button className={s.secondary} disabled={busy} onClick={()=>requestExtension(l)}>기간 연장 신청</button>}
            </div>
          </div>
        }):<div className={s.panel} style={{color:'#81898d'}}>{loading?'대출 내역을 불러오는 중입니다.':'대출 내역이 없습니다.'}</div>}
      </section>}

      <section className={s.features}>
        <div className={s.feature}><div className={s.featureIcon}>◈</div><h3>실제 보유 코인 담보</h3><p>보유 중이며 사용 가능한 BTC, ETH, SOL, XRP, USDT 등 지원 자산만 담보로 선택할 수 있습니다.</p></div>
        <div className={s.feature}><div className={s.featureIcon}>◷</div><h3>7일 고정기간 이자</h3><p>기본 상품은 7일 전체 기간에 1%가 적용되며, 연장 시 관리자가 제시한 조건에 회원이 동의한 경우에만 변경됩니다.</p></div>
        <div className={s.feature}><div className={s.featureIcon}>◇</div><h3>만기 후 담당자 협의</h3><p>만기 미상환 시 즉시 담보를 회수하지 않고 OVERDUE_REVIEW 상태에서 연장·연체·담보 회수 여부를 협의합니다.</p></div>
      </section>
    </div></section>

    {selected&&<div className={s.modal}><div className={s.modalCard}>
      <div className={s.modalHead}><div><b style={{fontSize:20}}>대출 신청</b><span className={s.muted} style={{display:'block'}}>{selected.name}</span></div><button className={s.close} onClick={()=>setSelected(null)}>×</button></div>
      <div className={s.modalSteps}>{[['1','상품 선택'],['2','담보 및 금액'],['3','조건 확인'],['4','대출 실행']].map(([n,t],i)=><span key={n} className={step>=i+1?s.modalStepActive:''}><b>{n}</b>{t}</span>)}</div>

      <div className={s.field}><label>담보 코인</label><select className={s.select} value={asset} onChange={e=>{setAsset(e.target.value);setQuote(null);setStep(2);setCollateralQty('');setPrincipal('')}}>
        {options.length?options.map(o=><option key={o.asset} value={o.asset}>{o.asset}</option>):<option value="">보유 중인 담보 가능 자산 없음</option>}
      </select></div>

      {selectedOption&&<div className={s.quote}>
        <div className={s.quoteBox}><small>현재 보유수량</small><b>{qtyFmt(selectedOption.total)} {selectedOption.asset}</b></div>
        <div className={s.quoteBox}><small>현재 사용가능수량</small><b>{qtyFmt(selectedOption.available)} {selectedOption.asset}</b></div>
        <div className={s.quoteBox}><small>현재 시세</small><b>{money(selectedOption.price)}</b></div>
        <div className={s.quoteBox}><small>사용가능 평가금액</small><b>{money(selectedOption.available_value)}</b></div>
      </div>}

      <div className={s.field}><label>담보 설정수량 ({asset||'—'})</label><input className={s.input} value={collateralQty} onChange={e=>{setCollateralQty(e.target.value);setQuote(null);setStep(2)}} inputMode="decimal" placeholder="담보 수량 직접 입력"/></div>
      <div className={s.field}><label>대출 신청금액 ({wallet.unit})</label><input className={s.input} value={principal?String(Math.round(wallet.toDisplay(Number(principal)||0)*100)/100):''} onChange={e=>{const v=Number(e.target.value.replace(/,/g,''));if(!Number.isFinite(v))return;setPrincipal(String(wallet.fromDisplay(v)));setQuote(null);setStep(2)}} inputMode="decimal" placeholder="대출금액 직접 입력"/></div>
      <button className={s.secondary} style={{width:'100%'}} onClick={calc} disabled={busy||!asset}>{busy?'계산 중...':'조건 확인'}</button>

      {quote&&<><div className={s.quote} style={{marginTop:14}}>
        <div className={s.quoteBox}><small>담보 평가금액</small><b>{money(quote.collateral_value)}</b></div>
        <div className={s.quoteBox}><small>최대 LTV</small><b>{pct(quote.max_ltv)}</b></div>
        <div className={s.quoteBox}><small>최대 대출가능금액</small><b>{money(quote.max_borrow)}</b></div>
        <div className={s.quoteBox}><small>선택 대출금액</small><b>{money(quote.principal)}</b></div>
        <div className={s.quoteBox}><small>기본 이자율</small><b>{pct(quote.base_interest_rate)}</b></div>
        <div className={s.quoteBox}><small>대출기간</small><b>{quote.term_days}일</b></div>
        <div className={s.quoteBox}><small>상환 예정일</small><b>{new Date(quote.due_at).toLocaleDateString('ko-KR')}</b></div>
        <div className={s.quoteBox}><small>예상 이자</small><b>{money(quote.estimated_interest)}</b></div>
        <div className={s.quoteBox}><small>총 상환예정금액</small><b>{money(quote.total_repayment_amount)}</b></div>
      </div>
      <div className={s.notice}>대출 신청 시 서버에서 실제 보유수량·현재 시세·담보가치·80% LTV를 다시 검증합니다. 신청 후 승인 전까지 담보가치는 출금 제한으로 예약되지만 내부 매매에는 사용할 수 있습니다. 관리자 승인 전에는 대출금이 지급되지 않습니다.</div>
      <label className={s.agree}><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/><span>담보가치는 출금 제한용으로 유지되며 내부 거래는 가능하다는 점과 7일 고정기간, 기본 이자 1%, 만기 및 연장 조건을 확인했습니다.</span></label>
      <button className={s.primary} style={{width:'100%'}} onClick={apply} disabled={busy||!agree||!logged}>{logged?(busy?'처리 중...':'대출 실행'):'로그인 후 신청'}</button></>}
      {msg&&<p className={msg.includes('접수')||msg.includes('완료')?s.success:s.error}>{msg}</p>}
    </div></div>}
  </main>;
}
