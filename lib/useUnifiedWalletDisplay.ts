'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';

export type DisplayCurrency='KRW'|'USDT';

type WalletSnapshot={
  wallet?:{base_currency?:string;available?:number;locked?:number;total?:number};
  spot?:Array<{asset:string;available:number;locked:number}>;
};

export function useUnifiedWalletDisplay(){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [currency,setCurrency]=useState<DisplayCurrency>('KRW');
  const [krwRate,setKrwRate]=useState(0);
  const [available,setAvailable]=useState(0);
  const [locked,setLocked]=useState(0);
  const [total,setTotal]=useState(0);
  const [loggedIn,setLoggedIn]=useState(false);
  const [loading,setLoading]=useState(true);

  const loadWallet=useCallback(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    setLoggedIn(!!user);
    if(!user){setAvailable(0);setLocked(0);setTotal(0);setLoading(false);return;}
    const {data,error}=await supabase.rpc('user_wallet_snapshot');
    if(!error&&data){
      const snap=data as WalletSnapshot;
      const usdt=Array.isArray(snap.spot)?snap.spot.find(x=>x.asset==='USDT'):null;
      const a=Number(snap.wallet?.available??usdt?.available??0);
      const l=Number(snap.wallet?.locked??usdt?.locked??0);
      setAvailable(a);setLocked(l);setTotal(Number(snap.wallet?.total??a+l));
    }
    setLoading(false);
  },[supabase]);

  const loadRate=useCallback(async()=>{
    try{
      const r=await fetch('/api/fx/usdt-krw',{cache:'no-store'});
      if(!r.ok)return;
      const j=await r.json();
      const rate=Number(j?.rate||0);
      if(rate>0)setKrwRate(rate);
    }catch{}
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
    readCurrency();loadWallet();loadRate();
    window.addEventListener('bitmate:display-currency',onCurrency as EventListener);
    const walletId=setInterval(loadWallet,3000);
    const rateId=setInterval(loadRate,60000);
    return()=>{window.removeEventListener('bitmate:display-currency',onCurrency as EventListener);clearInterval(walletId);clearInterval(rateId)};
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
