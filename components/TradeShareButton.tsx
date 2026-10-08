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
   <div className={s.dialog} role="dialog" aria-modal="true" aria-label="공유 이미지 미리보기">
    <div className={s.head}><h3>거래 공유 이미지 미리보기</h3><button type="button" onClick={()=>setPreview(null)} aria-label="닫기">×</button></div>
    <div className={s.body}><img src={preview.url} alt={trade.symbol+' 거래 공유 이미지'} className={s.image}/></div>
    <div className={s.actions}><button type="button" onClick={()=>setPreview(null)}>닫기</button><button type="button" className={s.download} onClick={download}>PNG 다운로드</button></div>
   </div>
  </div>}
 </>;
}
