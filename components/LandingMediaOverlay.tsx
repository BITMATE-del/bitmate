'use client';

import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';

type Props={slotKey:string;alt:string;className?:string};

export default function LandingMediaOverlay({slotKey,alt,className}:Props){
  const supabase=useMemo(()=>createBrowserSupabase(),[]);
  const [url,setUrl]=useState<string>('');
  useEffect(()=>{
    let alive=true;
    supabase.from('landing_media_slots').select('image_url').eq('slot_key',slotKey).maybeSingle().then(({data})=>{
      if(alive)setUrl(String(data?.image_url||''));
    });
    return()=>{alive=false};
  },[slotKey,supabase]);
  if(!url)return null;
  return <div className={className} style={{position:'absolute',inset:0,zIndex:8,overflow:'hidden',background:'#0b0c0e',display:'grid',placeItems:'center'}}>
    <img src={url} alt={alt} style={{width:'100%',height:'100%',display:'block',objectFit:'contain',objectPosition:'center'}}/>
  </div>;
}
