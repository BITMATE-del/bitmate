import Link from 'next/link';

const notices=[
 {cat:'중요',title:'BITMATE 서비스 운영 및 시스템 업데이트 안내',date:'2026-09-17',views:'1,248',tag:'IMPORTANT'},
 {cat:'거래',title:'Futures 거래 시스템 점검 및 주문 기능 안내',date:'2026-09-17',views:'864',tag:'NEW'},
 {cat:'입출금',title:'일부 네트워크 입출금 점검 안내',date:'2026-09-16',views:'643',tag:''},
 {cat:'상품',title:'Crypto Loan 상품 정책 및 LTV 기준 안내',date:'2026-09-15',views:'521',tag:''},
 {cat:'이벤트',title:'Lucky Draw 시즌 참여 조건 안내',date:'2026-09-14',views:'402',tag:''},
 {cat:'보안',title:'계정 보안 강화를 위한 2FA 권장 안내',date:'2026-09-13',views:'377',tag:''},
];
const categories=['전체','중요공지','거래','입출금','시스템','신규 서비스','이벤트','보안'];

export default function NoticePage(){return <main style={{minHeight:'calc(100vh - 72px)',background:'#08090a',color:'#f4f6f7',padding:'42px 0 90px'}}><div className="xtShell">
 <div style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'end',flexWrap:'wrap',paddingBottom:24,borderBottom:'1px solid #222629'}}>
  <div><span style={{fontSize:11,color:'#7d858a',fontWeight:900,letterSpacing:'.14em'}}>SYSTEM & SERVICE</span><h1 style={{fontSize:'clamp(38px,5vw,62px)',margin:'8px 0 8px',letterSpacing:'-.045em'}}>Notice Center</h1><p style={{margin:0,color:'#8a9297'}}>서비스 운영, 시스템 점검, 거래·입출금 및 정책 변경 사항을 확인하세요.</p></div>
  <div style={{display:'flex',gap:10}}><input placeholder="공지 검색" style={{width:240,height:42,border:'1px solid #303539',background:'#111416',color:'#fff',borderRadius:9,padding:'0 13px'}}/><button style={{height:42,padding:'0 16px',borderRadius:9,border:'1px solid #34393d',background:'#171a1c',color:'#fff',fontWeight:800}}>검색</button></div>
 </div>
 <div style={{display:'flex',gap:8,flexWrap:'wrap',padding:'18px 0 22px'}}>{categories.map((x,i)=><button key={x} style={{height:34,padding:'0 13px',borderRadius:999,border:'1px solid '+(i===0?'#88c81a':'#2c3033'),background:i===0?'#17200e':'#101214',color:i===0?'#b9ff31':'#8c9499',fontSize:12,fontWeight:800}}>{x}</button>)}</div>
 <section style={{display:'grid',gridTemplateColumns:'1.35fr .65fr',gap:18}}>
  <div style={{border:'1px solid #25292c',borderRadius:14,overflow:'hidden',background:'#0e1011'}}>
   <div style={{display:'grid',gridTemplateColumns:'120px 1fr 110px 90px',padding:'13px 18px',fontSize:11,color:'#70787d',borderBottom:'1px solid #23272a'}}><span>카테고리</span><span>제목</span><span>날짜</span><span style={{textAlign:'right'}}>조회</span></div>
   {notices.map(n=><Link key={n.title} href="#" style={{display:'grid',gridTemplateColumns:'120px 1fr 110px 90px',padding:'18px',borderBottom:'1px solid #1d2022',alignItems:'center',color:'#eef1f2'}}><span style={{fontSize:12,color:n.cat==='중요'?'#b9ff31':'#8f979c',fontWeight:800}}>{n.cat}</span><span style={{fontSize:14,fontWeight:800}}>{n.title} {n.tag&&<em style={{fontStyle:'normal',fontSize:10,color:n.tag==='IMPORTANT'?'#ff6979':'#b9ff31',marginLeft:7}}>{n.tag}</em>}</span><span style={{fontSize:12,color:'#71797e'}}>{n.date}</span><span style={{fontSize:12,color:'#71797e',textAlign:'right'}}>{n.views}</span></Link>)}
  </div>
  <aside style={{display:'grid',gap:14}}>
   <div style={{border:'1px solid #25292c',background:'#111315',borderRadius:14,padding:20}}><span style={{fontSize:11,color:'#747c81',fontWeight:900,letterSpacing:'.12em'}}>QUICK LINKS</span><div style={{display:'grid',gap:10,marginTop:14}}>{[['입출금 상태','/deposit'],['Futures 거래','/futures'],['CFD 거래','/cfd'],['고객 지원','/more/academy']].map(([t,h])=><Link key={t} href={h} style={{padding:'13px 14px',background:'#191c1e',border:'1px solid #24282b',borderRadius:9,fontWeight:800,fontSize:13}}>{t}<span style={{float:'right',color:'#667076'}}>›</span></Link>)}</div></div>
   <div style={{border:'1px solid #25292c',background:'#111315',borderRadius:14,padding:20}}><b style={{fontSize:16}}>공지 알림</b><p style={{color:'#7d858a',fontSize:13,lineHeight:1.7}}>중요 거래·입출금·보안 공지는 헤더 알림센터에서도 확인할 수 있습니다.</p><Link href="/more/academy" style={{color:'#b9ff31',fontSize:12,fontWeight:900}}>서비스 이용 가이드 ›</Link></div>
  </aside>
 </section>
 </div></main>}
