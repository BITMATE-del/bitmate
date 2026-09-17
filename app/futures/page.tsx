import type {Metadata} from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Futures | BITMATE',
  description: 'BITMATE USDT 무기한 선물거래',
};

export default function FuturesPage() {
  return (
    <main style={{minHeight:'60vh',background:'#101214',color:'#f3f5f6',padding:'64px 24px'}}>
      <section style={{maxWidth:'1120px',margin:'0 auto'}} aria-labelledby="futures-title">
        <p style={{fontSize:'13px',color:'#969da4',letterSpacing:'0.08em'}}>BITMATE FUTURES</p>
        <h1 id="futures-title" style={{fontSize:'clamp(28px, 5vw, 44px)',margin:'16px 0'}}>USDT 무기한 선물거래</h1>
        <p style={{color:'#c4c9ce',fontSize:'16px',lineHeight:1.8}}>선물거래 서비스는 준비 중입니다. 현재 주문 및 거래는 지원하지 않습니다.</p>
        <Link href="/cfd" style={{display:'inline-block',marginTop:'24px',padding:'12px 18px',border:'1px solid #444a50',borderRadius:'4px',color:'#f3f5f6'}}>CFD 거래로 이동</Link>
      </section>
    </main>
  );
}
