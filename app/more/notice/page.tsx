'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';

type Notice={id:string;slug:string;category:string;title:string;summary:string;body:string;pinned:boolean;published_at:string|null;created_at:string};
const cats=[['ALL','전체'],['GENERAL','일반'],['TRADING','거래'],['DEPOSIT_WITHDRAWAL','입출금'],['SYSTEM','시스템'],['LISTING','신규 서비스'],['EVENT','이벤트'],['SECURITY','보안']];
const label=(x:string)=>cats.find(c=>c[0]===x)?.[1]||x;

export default function NoticePage(){
 const supabase=useMemo(()=>createBrowserSupabase(),[]); const [rows,setRows]=useState<Notice[]>([]); const [cat,setCat]=useState('ALL'); const [q,setQ]=useState(''); const [loading,setLoading]=useState(true);
 useEffect(()=>{supabase.from('notices').select('id,slug,category,title,summary,body,pinned,published_at,created_at').eq('status','PUBLISHED').order('pinned',{ascending:false}).order('published_at',{ascending:false}).then(({data})=>{setRows((data||[]) as Notice[]);setLoading(false)})},[supabase]);
 const filtered=rows.filter(n=>(cat==='ALL'||n.category===cat)&&(!q.trim()||`${n.title} ${n.summary}`.toLowerCase().includes(q.trim().toLowerCase())));
 return <main style={{minHeight:'calc(100vh - 72px)',background:'#08090a',color:'#f4f6f7',padding:'42px 0 90px'}}><div className="xtShell">
  <div style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'end',flexWrap:'wrap',paddingBottom:24,borderBottom:'1px solid #222629'}}><div><span style={{fontSize:11,color:'#7d858a',fontWeight:900,letterSpacing:'.14em'}}>SYSTEM & SERVICE</span><h1 style={{fontSize:'clamp(38px,5vw,62px)',margin:'8px 0 8px',letterSpacing:'-.045em'}}>Notice Center</h1><p style={{margin:0,color:'#8a9297'}}>서비스 운영, 시스템 점검, 거래·입출금 및 정책 변경 사항을 확인하세요.</p></div><input value={q} onChange={e=>setQ(e.target.value)} placeholder="공지 검색" style={{width:280,height:42,border:'1px solid #303539',background:'#111416',color:'#fff',borderRadius:9,padding:'0 13px'}}/></div>
  <div style={{display:'flex',gap:8,flexWrap:'wrap',padding:'18px 0 22px'}}>{cats.map(([k,t])=><button key={k} onClick={()=>setCat(k)} style={{height:34,padding:'0 13px',borderRadius:999,border:'1px solid '+(cat===k?'#88c81a':'#2c3033'),background:cat===k?'#17200e':'#101214',color:cat===k?'#b9ff31':'#8c9499',fontSize:12,fontWeight:800,cursor:'pointer'}}>{t}</button>)}</div>
  <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.35fr) minmax(280px,.65fr)',gap:18}}><div style={{border:'1px solid #25292c',borderRadius:14,overflow:'hidden',background:'#0e1011'}}>
   {loading?<div style={{padding:34,color:'#727b80'}}>불러오는 중...</div>:filtered.length?filtered.map(n=><Link key={n.id} href={`/more/notice/${n.slug}`} style={{display:'grid',gridTemplateColumns:'110px 1fr 110px',gap:10,padding:'18px',borderBottom:'1px solid #1d2022',alignItems:'center',color:'#eef1f2'}}><span style={{fontSize:12,color:n.pinned?'#b9ff31':'#8f979c',fontWeight:800}}>{n.pinned?'중요 · ':''}{label(n.category)}</span><span><b style={{display:'block',fontSize:14}}>{n.title}</b><small style={{display:'block',marginTop:5,color:'#70787d',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{n.summary}</small></span><span style={{fontSize:12,color:'#71797e',textAlign:'right'}}>{new Date(n.published_at||n.created_at).toLocaleDateString('ko-KR')}</span></Link>):<div style={{padding:34,color:'#727b80'}}>조건에 맞는 공지가 없습니다.</div>}
  </div><aside style={{display:'grid',gap:14,alignContent:'start'}}><div style={{border:'1px solid #25292c',background:'#111315',borderRadius:14,padding:20}}><span style={{fontSize:11,color:'#747c81',fontWeight:900,letterSpacing:'.12em'}}>QUICK LINKS</span><div style={{display:'grid',gap:10,marginTop:14}}>{[['입금','/deposit'],['Futures','/futures'],['CFD','/cfd'],['Academy','/more/academy']].map(([t,h])=><Link key={t} href={h} style={{padding:'13px 14px',background:'#191c1e',border:'1px solid #24282b',borderRadius:9,fontWeight:800,fontSize:13}}>{t}<span style={{float:'right',color:'#667076'}}>›</span></Link>)}</div></div></aside></section>
 </div></main>
}
