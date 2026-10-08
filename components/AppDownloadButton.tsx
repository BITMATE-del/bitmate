'use client';

import {useState} from 'react';
import UiIcon from './UiIcon';

const APK='/downloads/bitmate-latest.apk';

export default function AppDownloadButton(){
 const [checking,setChecking]=useState(false);
 const [unavailable,setUnavailable]=useState(false);
 async function download(){
  if(checking)return;
  setChecking(true);
  setUnavailable(false);
  try{
   const response=await fetch(APK,{method:'HEAD',cache:'no-store'});
   if(!response.ok)throw new Error('apk_not_published');
   const a=document.createElement('a');
   a.href=APK;
   a.download='bitmate-latest.apk';
   document.body.appendChild(a);
   a.click();
   a.remove();
  }catch{
   setUnavailable(true);
  }finally{
   setChecking(false);
  }
 }
 return <div style={{display:'flex',alignItems:'center',gap:12,marginTop:18,flexWrap:'wrap'}}>
  <button type="button" onClick={download} disabled={checking} aria-label="BITMATE 안드로이드 앱 다운로드" title="BITMATE Android APK 다운로드" style={{width:44,height:44,border:'1px solid #34393d',borderRadius:'50%',background:'#111416',color:'#fff',display:'grid',placeItems:'center',cursor:checking?'wait':'pointer'}}>
   <UiIcon name="download" size={19}/>
  </button>
  {checking&&<span role="status" style={{fontSize:13,color:'#b7c5bd'}}>다운로드 파일 확인 중…</span>}
  {unavailable&&<span role="alert" style={{fontSize:13,color:'#f2c879',maxWidth:300}}>앱 설치 파일 준비 중입니다. 게시 후 이 버튼에서 다운로드할 수 있습니다.</span>}
 </div>;
}
