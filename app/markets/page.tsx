import MarketBoard from '@/components/MarketBoard';

export const metadata={title:'Markets | BITMATE'};

export default function MarketsPage(){
  return <main style={{minHeight:'calc(100vh - 72px)',background:'#0b0c0e'}}><MarketBoard/></main>;
}
