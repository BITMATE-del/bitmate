'use client';

import {useEffect,useState} from 'react';
import {buildTradeShareCardPreview,type TradeShareCardInput} from '@/lib/trade-share-card';
import s from './TradeShareButton.module.css';

export default function TradeShareButton({trade}:{trade:TradeShareCardInput}){
 const [loading,setLoading]=useState(false);
 const [preview,setPreview]=useState<{url:string;filename:string}|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview.url)},[preview]);
 async function open(){
  if(loading)return;
  setLoading(true);setError('');
  try{setPreview(await buildTradeShareCardPreview(trade))}
  catch(e){setError(e instanceof Error?e.message:'공유 이미지 생성에 실패했습니다.')}
  finally{setLoading(false)}
 }
 function download(){
  if(!preview)return;
  const a=document.createElement('a');a.href=preview.url;a.download=preview.filename;
  document.body.appendChild(a);a.click();a.remove();
 }
 return <>
  <button type="button" className={s.trigger} disabled={loading} onClick={open}>{loading?'이미지 생성 중…':'공유 이미지'}</button>
  {error&&<div className={s.error} role="alert">{error}<button type="button" onClick={()=>setError('')} aria-label="오류 닫기">×</button></div>}
  {preview&&<div className={s.overlay} onMouseDown={e=>{if(e.target===e.currentTarget)setPreview(null)}}>
   <div className={s.frame} role="dialog" aria-modal="true" aria-label="거래 공유 이미지">
    <img src={preview.url} alt={trade.symbol+' 거래 공유 이미지'} className={s.image}/>
    <button type="button" className={s.downloadIcon} onClick={download} title="이미지 다운로드" aria-label="PNG 다운로드">
     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M4 17v3h16v-3"/></svg>
    </button>
   </div>
  </div>}
 </>;
}
