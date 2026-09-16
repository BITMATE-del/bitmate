import CfdTimedTradingClient from '@/components/CfdTimedTradingClient';
import TradingViewCfdInjector from '@/components/TradingViewCfdInjector';

export default function Page(){
  return <>
    <style>{`
      [class*="orderPanel"] {
        align-self: start !important;
        height: auto !important;
        min-height: 0 !important;
      }
    `}</style>
    <CfdTimedTradingClient/>
    <TradingViewCfdInjector/>
  </>
}
