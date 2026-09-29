'use client';

import {useEffect,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import {Network} from '@capacitor/network';
import {Keyboard} from '@capacitor/keyboard';
import {SplashScreen} from '@capacitor/splash-screen';
import {StatusBar,Style} from '@capacitor/status-bar';
import {Browser} from '@capacitor/browser';
import {siteConfirm} from './SiteDialog';

const INTERNAL_HOSTS=new Set(['bitmates.vercel.app']);

function nativePathFromUrl(raw:string){
  try{
    const u=new URL(raw);
    if(u.protocol==='bitmate:'){
      const path=[u.hostname,...u.pathname.split('/').filter(Boolean)].filter(Boolean).join('/');
      return '/'+path+u.search+u.hash;
    }
    if(INTERNAL_HOSTS.has(u.hostname))return u.pathname+u.search+u.hash;
  }catch{}
  return null;
}

export default function NativeBridge(){
  const [native,setNative]=useState(false);
  const [offline,setOffline]=useState(false);

  useEffect(()=>{
    if(!Capacitor.isNativePlatform())return;
    setNative(true);
    document.documentElement.classList.add('is-native-app');

    let alive=true;
    const removers:Array<()=>void>=[];
    const add=async(p:Promise<{remove:()=>Promise<void>}>)=>{
      const handle=await p;
      if(!alive){void handle.remove();return}
      removers.push(()=>{void handle.remove()});
    };

    void StatusBar.setStyle({style:Style.Light}).catch(()=>{});
    void StatusBar.setOverlaysWebView({overlay:true}).catch(()=>{});
    window.setTimeout(()=>void SplashScreen.hide({fadeOutDuration:220}).catch(()=>{}),350);

    void Network.getStatus().then(s=>{if(alive)setOffline(!s.connected)}).catch(()=>{});
    void add(Network.addListener('networkStatusChange',status=>{
      setOffline(!status.connected);
      window.dispatchEvent(new Event(status.connected?'online':'offline'));
      if(status.connected)window.dispatchEvent(new CustomEvent('bitmate:native-resume',{detail:{reason:'network'}}));
    }));

    void add(App.addListener('appStateChange',({isActive})=>{
      document.documentElement.classList.toggle('native-app-active',isActive);
      if(isActive){
        window.dispatchEvent(new Event('focus'));
        window.dispatchEvent(new CustomEvent('bitmate:native-resume',{detail:{reason:'foreground'}}));
      }
    }));

    void add(App.addListener('appUrlOpen',({url})=>{
      const path=nativePathFromUrl(url);
      if(path&&path!==location.pathname+location.search+location.hash)location.assign(path);
    }));

    void add(App.addListener('backButton',async({canGoBack})=>{
      const event=new CustomEvent('bitmate:native-back',{cancelable:true});
      window.dispatchEvent(event);
      if(event.defaultPrevented)return;
      if(location.pathname!=='/'&&(canGoBack||history.length>1)){history.back();return}
      const exit=await siteConfirm('BITMATE 앱을 종료하시겠습니까?',{title:'앱 종료'});
      if(exit)void App.exitApp();
    }));

    void add(Keyboard.addListener('keyboardWillShow',info=>{
      document.documentElement.classList.add('native-keyboard-open');
      document.documentElement.style.setProperty('--native-keyboard-height',`${info.keyboardHeight}px`);
    }));
    void add(Keyboard.addListener('keyboardWillHide',()=>{
      document.documentElement.classList.remove('native-keyboard-open');
      document.documentElement.style.removeProperty('--native-keyboard-height');
    }));

    const externalClick=(e:MouseEvent)=>{
      const target=(e.target as HTMLElement|null)?.closest?.('a[href]') as HTMLAnchorElement|null;
      if(!target)return;
      const href=target.href;
      if(!href)return;
      try{
        const u=new URL(href,location.href);
        if(u.protocol==='http:'||u.protocol==='https:'){
          if(!INTERNAL_HOSTS.has(u.hostname)&&u.hostname!==location.hostname){
            e.preventDefault();
            void Browser.open({url:u.toString(),toolbarColor:'#090B0D'});
          }
        }
      }catch{}
    };
    document.addEventListener('click',externalClick,true);

    return()=>{
      alive=false;
      removers.forEach(fn=>fn());
      document.removeEventListener('click',externalClick,true);
      document.documentElement.classList.remove('is-native-app','native-keyboard-open','native-app-active');
    };
  },[]);

  if(!native)return null;
  return <div className={offline?'nativeNetworkBanner show':'nativeNetworkBanner'} role="status" aria-live="polite">네트워크 연결을 확인해주세요.</div>;
}
