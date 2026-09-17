import type {Metadata} from 'next';
import FuturesTradingClient from '@/components/FuturesTradingClient';
import TradingViewCfdInjector from '@/components/TradingViewCfdInjector';

export const metadata: Metadata = {
  title: 'Futures | BITMATE',
  description: 'BITMATE USDT 무기한 선물거래',
};

export default function FuturesPage(){
  return <>
    <FuturesTradingClient/>
    <TradingViewCfdInjector/>
  </>;
}
