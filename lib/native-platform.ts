'use client';

import {Capacitor} from '@capacitor/core';
import {Clipboard} from '@capacitor/clipboard';
import {Browser} from '@capacitor/browser';

export const isNativePlatform=()=>typeof window!=='undefined'&&Capacitor.isNativePlatform();

export async function copyTextNativeAware(value:string){
  if(isNativePlatform()){
    await Clipboard.write({string:value});
    return;
  }
  await navigator.clipboard.writeText(value);
}

export async function openExternalNativeAware(url:string){
  if(isNativePlatform()){
    await Browser.open({url});
    return;
  }
  window.open(url,'_blank','noopener,noreferrer');
}
