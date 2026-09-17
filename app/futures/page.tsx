import type {Metadata} from 'next';
import FuturesTradingClient from '@/components/FuturesTradingClient';
import TradingViewCfdInjector from '@/components/TradingViewCfdInjector';
import LiveMarketTicker from '@/components/LiveMarketTicker';

export const metadata: Metadata = {
  title: 'Futures | BITMATE',
  description: 'BITMATE USDT 무기한 선물거래',
};

export default function FuturesPage(){
  return <>
    <FuturesTradingClient/>
    <LiveMarketTicker marketType="futures" label="Futures 실시간"/>
    <TradingViewCfdInjector/>
  </>;
}
