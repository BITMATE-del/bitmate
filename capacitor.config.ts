import type {CapacitorConfig} from '@capacitor/cli';

const serverUrl=process.env.CAPACITOR_SERVER_URL||'https://bitmates.vercel.app';
const appId=process.env.CAPACITOR_APP_ID||'com.bitmate.app';

const config:CapacitorConfig={
  appId,
  appName:'BITMATE',
  webDir:'native',
  server:{
    url:serverUrl,
    cleartext:false,
    androidScheme:'https',
    allowNavigation:[
      'bitmates.vercel.app',
      '*.supabase.co',
      '*.binance.com',
      's3.tradingview.com',
      '*.tradingview.com'
    ]
  },
  android:{
    backgroundColor:'#0b0c0e',
    allowMixedContent:false,
    captureInput:true
  },
  ios:{
    backgroundColor:'#0b0c0e',
    contentInset:'automatic',
    scrollEnabled:true,
    allowsLinkPreview:false
  },
  plugins:{
    SplashScreen:{
      launchShowDuration:1800,
      launchAutoHide:false,
      backgroundColor:'#0b0c0e',
      androidScaleType:'CENTER_CROP',
      showSpinner:false,
      splashFullScreen:true,
      splashImmersive:true
    },
    StatusBar:{
      style:'LIGHT',
      backgroundColor:'#0b0c0e',
      overlaysWebView:false
    },
    Keyboard:{
      resize:'body',
      resizeOnFullScreen:true
    }
  }
};

export default config;
