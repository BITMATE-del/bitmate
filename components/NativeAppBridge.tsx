'use client';

import {useEffect,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import {Browser} from '@capacitor/browser';
import {Network} from '@capacitor/network';
import {SplashScreen} from '@capacitor/splash-screen';
import {StatusBar,Style} from '@capacitor/status-bar';
import {Keyboard} from '@capacitor/keyboard';

const isExternalHttp=(url:string)=>{
  try{
    const parsed=new URL(url,window.location.href);
    return /^https?:$/.test(parsed.protocol)&&parsed.origin!==window.location.origin;
  }catch{return false}
};

export default function NativeAppBridge(){
  const [offline,setOffline]=useState(false);
  const [exitHint,setExitHint]=useState(false);

  useEffect(()=>{
    if(!Capacitor.isNativePlatform())return;

    let cancelled=false;
    let lastExitPress=0;
    const handles:Array<{remove:()=>Promise<void>}>=[];

    const syncForeground=()=>{
      window.dispatchEvent(new CustomEvent('bitmate:native-resume'));
      window.dispatchEvent(new Event('focus'));
      if(navigator.onLine)window.dispatchEvent(new Event('online'));
    };

    const setup=async()=>{
      try{
        await StatusBar.setStyle({style:Style.Light});
        if(Capacitor.getPlatform()==='android'){
          await StatusBar.setBackgroundColor({color:'#0b0c0e'});
          await StatusBar.setOverlaysWebView({overlay:false});
        }
      }catch{}

      try{
        const status=await Network.getStatus();
        if(!cancelled)setOffline(!status.connected);
      }catch{}

      try{
        handles.push(await Network.addListener('networkStatusChange',status=>{
          setOffline(!status.connected);
          if(status.connected)syncForeground();
        }));
      }catch{}

      try{
        handles.push(await App.addListener('appStateChange',state=>{
          if(state.isActive)syncForeground();
        }));
      }catch{}

      try{
        handles.push(await App.addListener('backButton',async({canGoBack})=>{
          const evt=new CustomEvent('bitmate:native-back',{cancelable:true});
          const notHandled=window.dispatchEvent(evt);
          if(!notHandled)return;

          const visibleDialog=document.querySelector('[role="dialog"],[class*="modalBack"],[class*="modalBackdrop"],[class*="ModalBack"],[class*="backdrop"]');
          if(visibleDialog){
            document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
            return;
          }

          if(window.location.pathname!=='/'&&canGoBack){
            window.history.back();
            return;
          }

          const now=Date.now();
          if(now-lastExitPress<1800){
            await App.exitApp();
            return;
          }
          lastExitPress=now;
          setExitHint(true);
          window.setTimeout(()=>setExitHint(false),1600);
        }));
      }catch{}

      try{
        handles.push(await Keyboard.addListener('keyboardDidShow',()=>{
          document.documentElement.dataset.nativeKeyboard='open';
        }));
        handles.push(await Keyboard.addListener('keyboardDidHide',()=>{
          delete document.documentElement.dataset.nativeKeyboard;
        }));
      }catch{}

      const onClick=(event:MouseEvent)=>{
        const anchor=(event.target as HTMLElement|null)?.closest?.('a[href]') as HTMLAnchorElement|null;
        if(!anchor||anchor.hasAttribute('download'))return;
        const href=anchor.href;
        if(!href||!isExternalHttp(href))return;
        event.preventDefault();
        void Browser.open({url:href});
      };
      document.addEventListener('click',onClick,true);

      window.setTimeout(()=>void SplashScreen.hide().catch(()=>{}),250);

      return()=>document.removeEventListener('click',onClick,true);
    };

    let removeClick:(()=>void)|undefined;
    setup().then(clean=>{removeClick=clean}).catch(()=>{});

    return()=>{
      cancelled=true;
      removeClick?.();
      for(const handle of handles)void handle.remove().catch(()=>{});
    };
  },[]);

  return <>
    {offline&&<div style={{position:'fixed',left:12,right:12,top:'calc(10px + env(safe-area-inset-top))',zIndex:5000,padding:'11px 14px',border:'1px solid #4b3420',borderRadius:10,background:'#17120d',color:'#f2c98a',fontSize:12,fontWeight:750,textAlign:'center',boxShadow:'0 10px 30px rgba(0,0,0,.35)'}}>네트워크 연결을 확인해주세요.</div>}
    {exitHint&&<div style={{position:'fixed',left:'50%',bottom:'calc(82px + env(safe-area-inset-bottom))',transform:'translateX(-50%)',zIndex:5000,padding:'10px 14px',border:'1px solid #2f3a3f',borderRadius:10,background:'#11171a',color:'#eef3f5',fontSize:12,whiteSpace:'nowrap'}}>한 번 더 누르면 앱을 종료합니다.</div>}
  </>;
}
