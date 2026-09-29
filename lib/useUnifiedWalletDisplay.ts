// BITMATE unified wallet display source
'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';

export type DisplayCurrency='KRW'|'USDT';

type WalletSnapshot={
  wallet?:{base_currency?:string;available?:number;locked?:number;total?:number};
  spot?:Array<{asset:string;available:number;locked:number}>;
};
type WalletValues={available:number;locked:number;total:number};

let walletCache:{userId:string;at:number;value:WalletValues}|null=null;
let walletInflight:Promise<{userId:string;value:WalletValues}|null>|null=null;
let rateCache:{at:number;value:number}|null=null;
let rateInflight:Promise<number>|null=null;

export function useUnifiedWalletDisplay(){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [currency,setCurrency]=useState<DisplayCurrency>('KRW');
  const [krwRate,setKrwRate]=useState(0);
  const [available,setAvailable]=useState(0);
  const [locked,setLocked]=useState(0);
  const [total,setTotal]=useState(0);
  const [loggedIn,setLoggedIn]=useState(false);
  const [loading,setLoading]=useState(true);

  const applyWallet=useCallback((v:WalletValues)=>{
    setAvailable(v.available);
    setLocked(v.locked);
    setTotal(v.total);
  },[]);

  const loadWallet=useCallback(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    setLoggedIn(!!user);
    if(!user){
      walletCache=null;
      applyWallet({available:0,locked:0,total:0});
      setLoading(false);
      return;
    }

    const now=Date.now();
    if(walletCache?.userId===user.id&&now-walletCache.at<1200){
      applyWallet(walletCache.value);
      setLoading(false);
      return;
    }

    if(!walletInflight){
      walletInflight=(async()=>{
        const {data,error}=await supabase.rpc('user_wallet_snapshot');
        if(error||!data)return null;
        const snap=data as WalletSnapshot;
        const usdt=Array.isArray(snap.spot)?snap.spot.find(x=>x.asset==='USDT'):null;
        const a=Number(snap.wallet?.available??usdt?.available??0);
        const l=Number(snap.wallet?.locked??usdt?.locked??0);
        const value={available:a,locked:l,total:Number(snap.wallet?.total??a+l)};
        walletCache={userId:user.id,at:Date.now(),value};
        return {userId:user.id,value};
      })().finally(()=>{walletInflight=null});
    }

    const result=await walletInflight;
    if(result?.userId===user.id)applyWallet(result.value);
    setLoading(false);
  },[supabase,applyWallet]);

  const loadRate=useCallback(async()=>{
    const now=Date.now();
    if(rateCache&&now-rateCache.at<30000){
      setKrwRate(rateCache.value);
      return;
    }
    if(!rateInflight){
      rateInflight=(async()=>{
        try{
          const r=await fetch('/api/fx/usdt-krw',{cache:'no-store'});
          if(!r.ok)return 0;
          const j=await r.json();
          const rate=Number(j?.rate||0);
          if(rate>0)rateCache={at:Date.now(),value:rate};
          return rate;
        }catch{return 0}
      })().finally(()=>{rateInflight=null});
    }
    const rate=await rateInflight;
    if(rate>0)setKrwRate(rate);
  },[]);

  useEffect(()=>{
    const readCurrency=()=>{
      const saved=localStorage.getItem('bitmate_display_currency');
      setCurrency(saved==='USDT'?'USDT':'KRW');
    };
    const onCurrency=(e:Event)=>{
      const next=(e as CustomEvent<{currency?:DisplayCurrency}>).detail?.currency;
      if(next==='KRW'||next==='USDT')setCurrency(next);else readCurrency();
    };
    readCurrency();void loadWallet();void loadRate();
    const onNativeResume=()=>{void loadWallet();void loadRate()};
    window.addEventListener('bitmate:display-currency',onCurrency as EventListener);
    window.addEventListener('bitmate:native-resume',onNativeResume);
    const walletId=setInterval(()=>void loadWallet(),3000);
    const rateId=setInterval(()=>void loadRate(),60000);
    return()=>{window.removeEventListener('bitmate:display-currency',onCurrency as EventListener);window.removeEventListener('bitmate:native-resume',onNativeResume);clearInterval(walletId);clearInterval(rateId)};
  },[loadWallet,loadRate]);

  const unit=currency;
  const toDisplay=(usdt:number)=>{
    const n=Number(usdt||0);
    return currency==='KRW'?(krwRate>0?n*krwRate:NaN):n;
  };
  const fromDisplay=(value:number)=>{
    const n=Number(value||0);
    return currency==='KRW'?(krwRate>0?n/krwRate:0):n;
  };
  const formatMoney=(usdt:number,digits=2)=>{
    const v=toDisplay(usdt);
    if(!Number.isFinite(v))return '—';
    return currency==='KRW'
      ?Math.round(v).toLocaleString('ko-KR')
      :v.toLocaleString(undefined,{minimumFractionDigits:digits,maximumFractionDigits:digits});
  };
  const withUnit=(usdt:number,digits=2)=>`${formatMoney(usdt,digits)} ${unit}`;

  return {currency,unit,krwRate,available,locked,total,loggedIn,loading,loadWallet,toDisplay,fromDisplay,formatMoney,withUnit};
}
