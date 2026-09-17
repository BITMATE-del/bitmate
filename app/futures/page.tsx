import type {Metadata} from 'next';
import FuturesTradingClientV2 from '@/components/FuturesTradingClientV2';
import TradingViewCfdInjector from '@/components/TradingViewCfdInjector';

export const metadata: Metadata = {
  title: 'Futures | BITMATE',
  description: 'BITMATE USDT 무기한 선물거래',
};

export default function FuturesPage(){
  return <>
    <FuturesTradingClientV2/>
    <TradingViewCfdInjector/>
  </>;
}
