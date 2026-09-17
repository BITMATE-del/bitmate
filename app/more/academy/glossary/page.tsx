'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';

const terms=[
 ['Mark Price','Futures','청산과 미실현 손익 계산에 주로 사용하는 공정가격 기준입니다. 마지막 체결가와 다를 수 있습니다.'],
 ['Index Price','Futures','여러 현물 시장 가격을 참고해 만든 기준가격으로 Mark Price 계산의 기초가 됩니다.'],
 ['Last Price','Market','가장 최근에 실제로 체결된 가격입니다.'],
 ['Funding Rate','Futures','무기한 선물의 가격 괴리를 조정하기 위해 롱과 숏 사이에 주기적으로 적용되는 정산 비율입니다.'],
 ['Funding Time','Futures','Funding이 실제 적용되는 다음 정산 시각입니다.'],
 ['Long','Futures','가격 상승을 예상하고 진입하는 포지션 방향입니다.'],
 ['Short','Futures','가격 하락을 예상하고 진입하는 포지션 방향입니다.'],
 ['Cross Margin','Futures','선물 지갑의 사용 가능한 증거금을 여러 포지션 위험에 공동 활용하는 방식입니다.'],
 ['Isolated Margin','Futures','특정 포지션에 배정한 증거금을 중심으로 위험을 제한하는 방식입니다.'],
 ['Leverage','Futures','증거금보다 큰 명목가치를 운용하게 하는 배율입니다. 수익과 손실 위험을 함께 확대합니다.'],
 ['Liquidation','Futures','유지증거금 조건을 충족하지 못할 때 시스템이 포지션을 강제로 정리하는 절차입니다.'],
 ['Maintenance Margin','Futures','포지션을 유지하기 위해 필요한 최소 수준의 증거금입니다.'],
 ['ROE','Performance','투입 자기자본 또는 증거금 대비 손익률을 나타내는 지표입니다.'],
 ['MDD','Performance','Maximum Drawdown. 특정 기간의 고점 대비 최대 하락폭으로 전략 위험을 볼 때 사용합니다.'],
 ['Maker','Trading','호가창에 유동성을 추가하는 주문 유형을 뜻합니다. 일반적으로 즉시 체결되지 않는 지정가 주문이 해당될 수 있습니다.'],
 ['Taker','Trading','기존 호가를 가져가며 즉시 체결되는 주문 유형을 뜻합니다. 시장가 주문이 대표적입니다.'],
 ['Slippage','Trading','주문을 기대한 가격과 실제 체결 가격 사이의 차이입니다. 변동성과 유동성에 따라 커질 수 있습니다.'],
 ['TP / Take Profit','Trading','목표 수익 가격에 도달했을 때 포지션을 종료하기 위한 조건입니다.'],
 ['SL / Stop Loss','Trading','손실을 제한하기 위해 특정 조건에서 포지션을 종료하는 설정입니다.'],
 ['Reduce Only','Futures','기존 포지션을 줄이거나 종료만 하도록 제한하고 신규 반대 포지션 생성은 막는 옵션입니다.'],
 ['Post Only','Futures','주문이 즉시 Taker로 체결되지 않고 호가에 Maker 주문으로 등록되도록 제한하는 옵션입니다.'],
 ['LTV','Loan','Loan-to-Value. 대출금액을 담보가치로 나눈 비율이며 담보가격이 하락하면 상승할 수 있습니다.'],
 ['Margin Call','Loan','담보 비율이 위험구간에 진입했음을 알리고 담보 추가 또는 상환을 요구하는 경고 단계입니다.'],
 ['Order Book','Market','현재 시장의 매수·매도 대기 주문과 가격·수량을 보여주는 호가창입니다.'],
 ['Volume','Market','특정 기간 동안 거래된 수량 또는 거래대금을 의미합니다.'],
 ['Limit Order','Trading','사용자가 지정한 가격 또는 그보다 유리한 가격에서만 체결되도록 하는 주문입니다.'],
 ['Market Order','Trading','현재 시장의 가능한 호가를 사용해 빠르게 체결하는 주문입니다.'],
 ['Trigger Order','Trading','지정한 트리거 가격에 도달하면 실제 주문을 활성화하는 조건부 주문입니다.'],
 ['Trailing Stop','Trading','가격이 유리한 방향으로 움직일 때 기준을 따라가고 반전 폭이 조건에 도달하면 종료를 시도하는 주문입니다.'],
 ['WIN / DRAW / LOSS','CFD','BITMATE CFD에서 서버 시작가와 종료가, 선택 방향에 따라 결과를 구분하는 정산 상태입니다.']
];
const cats=['ALL','Market','Trading','Futures','CFD','Performance','Loan'];
export default function GlossaryPage(){const [q,setQ]=useState('');const [cat,setCat]=useState('ALL');const filtered=useMemo(()=>terms.filter(([t,c,d])=>(cat==='ALL'||c===cat)&&(!q.trim()||`${t} ${c} ${d}`.toLowerCase().includes(q.toLowerCase()))),[q,cat]);return <main style={{minHeight:'calc(100vh - 72px)',background:'#08090a',color:'#f4f6f7',padding:'42px 0 90px'}}><div className="xtShell" style={{maxWidth:1100}}><Link href="/more/academy" style={{color:'#858e93',fontSize:13}}>← Academy</Link><header style={{padding:'26px 0 24px',borderBottom:'1px solid #25292c'}}><small style={{color:'#b9ff31',fontWeight:900,letterSpacing:'.12em'}}>BITMATE GLOSSARY</small><h1 style={{fontSize:'clamp(38px,5vw,58px)',margin:'8px 0 12px',letterSpacing:'-.04em'}}>거래 용어사전</h1><p style={{color:'#8a9398',lineHeight:1.7,maxWidth:760}}>BITMATE 거래 화면과 Academy에서 자주 사용하는 용어를 상품별로 정리했습니다. 용어를 검색하거나 카테고리로 좁혀볼 수 있습니다.</p><input value={q} onChange={e=>setQ(e.target.value)} placeholder="용어 검색: Mark Price, LTV, Maker..." style={{marginTop:18,width:'min(520px,100%)',height:44,border:'1px solid #303539',background:'#111416',color:'#fff',borderRadius:9,padding:'0 14px'}}/></header><div style={{display:'flex',gap:8,flexWrap:'wrap',padding:'18px 0'}}>{cats.map(x=><button key={x} onClick={()=>setCat(x)} style={{height:32,padding:'0 12px',borderRadius:999,border:'1px solid '+(cat===x?'#78a91f':'#2b3033'),background:cat===x?'#17200f':'#111315',color:cat===x?'#b9ff31':'#879095',fontWeight:800,fontSize:11,cursor:'pointer'}}>{x}</button>)}</div><section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:12}}>{filtered.map(([t,c,d])=><article key={t} style={{border:'1px solid #25292c',background:'#101213',borderRadius:12,padding:18}}><small style={{color:'#b9ff31',fontWeight:900}}>{c}</small><h2 style={{fontSize:19,margin:'8px 0'}}>{t}</h2><p style={{margin:0,color:'#8a9398',fontSize:13,lineHeight:1.7}}>{d}</p></article>)}</section>{!filtered.length&&<div style={{padding:'40px 0',color:'#747c81'}}>검색 결과가 없습니다.</div>}</div></main>}
