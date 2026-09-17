import CfdTimedTradingClient from '@/components/CfdTimedTradingClient';
import TradingViewCfdInjector from '@/components/TradingViewCfdInjector';

export default function Page(){
  return <>
    <style>{`
      @media (min-width:1041px){
        [class*="orderPanel"]{padding:16px 14px !important;overflow:hidden !important;}
        [class*="directionRow"],[class*="durationRow"]{margin-bottom:14px !important;gap:8px !important;}
        [class*="directionRow"] button,[class*="durationRow"] button{height:48px !important;}
        [class*="label"]{margin:13px 0 7px !important;}
        [class*="balance"]{padding:10px 0 !important;}
        [class*="field"]{height:46px !important;}
        [class*="quickAmounts"]{margin:10px 0 14px !important;gap:6px !important;}
        [class*="quickAmounts"] button{height:34px !important;}
        [class*="summary"]{margin:14px 0 !important;}
        [class*="summary"] div{padding:10px 0 !important;min-height:34px !important;}
        [class*="summary"] span{font-size:9px !important;}
        [class*="summary"] b{font-size:11px !important;}
        [class*="submit"]{height:50px !important;flex:0 0 50px !important;}
        [class*="notice"]{margin-top:14px !important;padding:10px 0 0 !important;font-size:9px !important;line-height:1.7 !important;}
      }
    `}</style>
    <CfdTimedTradingClient/>
    <TradingViewCfdInjector/>
  </>
}
