import type {CapacitorConfig} from '@capacitor/cli';
import {KeyboardResize,KeyboardStyle} from '@capacitor/keyboard';

const appId=process.env.BITMATE_APP_ID||'com.bitmate.app';
const serverUrl=process.env.BITMATE_APP_SERVER_URL||'https://bitmates.vercel.app';

const config:CapacitorConfig={
  appId,
  appName:'BITMATE',
  webDir:'capacitor-shell',
  backgroundColor:'#090B0D',
  server:{
    url:serverUrl,
    cleartext:false,
    allowNavigation:['bitmates.vercel.app']
  },
  plugins:{
    SplashScreen:{
      launchShowDuration:1200,
      launchAutoHide:true,
      launchFadeOutDuration:220,
      backgroundColor:'#090B0D',
      showSpinner:false,
      androidScaleType:'CENTER_CROP'
    },
    StatusBar:{
      style:'LIGHT',
      backgroundColor:'#090B0D',
      overlaysWebView:true
    },
    Keyboard:{
      resize:KeyboardResize.Body,
      style:KeyboardStyle.Dark,
      resizeOnFullScreen:true,
      autoBackdropColor:'dom'
    }
  },
  android:{
    allowMixedContent:false,
    captureInput:true
  },
  ios:{
    contentInset:'automatic',
    allowsLinkPreview:false,
    scrollEnabled:true
  }
};

export default config;
