'use client';

import {Capacitor} from '@capacitor/core';

export function isNativeApp(){
  return typeof window!=='undefined'&&Capacitor.isNativePlatform();
}

export async function copyText(text:string){
  if(!text)return false;
  try{
    if(isNativeApp()){
      const {Clipboard}=await import('@capacitor/clipboard');
      await Clipboard.write({string:text});
      return true;
    }
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
      return true;
    }
  }catch{}
  try{
    const area=document.createElement('textarea');
    area.value=text;
    area.style.position='fixed';
    area.style.opacity='0';
    document.body.appendChild(area);
    area.select();
    const ok=document.execCommand('copy');
    area.remove();
    return ok;
  }catch{return false}
}

export async function openExternalUrl(url:string){
  if(!url)return;
  if(isNativeApp()){
    const {Browser}=await import('@capacitor/browser');
    await Browser.open({url,toolbarColor:'#090B0D'});
    return;
  }
  window.open(url,'_blank','noopener,noreferrer');
}
