import './globals.css';
import Link from 'next/link';
import ExchangeHeader from '@/components/ExchangeHeader';

export const metadata={title:'BITMATE | Digital Asset Exchange',description:'Markets, trading and digital asset management in one experience'};

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="ko"><body id="top">
    <ExchangeHeader/>
    {children}
    <footer className="xtFooter"><div className="xtShell">
      <div className="footerTop"><Link className="xtBrand" href="/"><span className="xtLogo">B</span><b>BITMATE</b></Link><p>Explore digital assets with a clear, demo-first trading experience.</p></div>
      <div className="footerCols">
        <div><h4>Company</h4><Link href="/">About</Link><Link href="/campaigns">Campaigns</Link><Link href="/finance">Security</Link><Link href="/more">App</Link></div>
        <div><h4>Trade</h4><Link href="/trade/spot">Spot</Link><Link href="/trade/etf">ETF</Link><Link href="/trade/margin">Margin</Link><Link href="/trade/pre-market">Pre-market</Link></div>
        <div><h4>Zones</h4><Link href="/trade/rwa">RWA Zone</Link><Link href="/trade/mining">Mining Zone</Link><Link href="/futures">Futures</Link><Link href="/tools">Tools</Link></div>
        <div><h4>Support</h4><Link href="/finance">Risk Notice</Link><Link href="/#markets">Market Status</Link><Link href="/more">Help Center</Link><Link href="/more">API</Link></div>
      </div>
      <div className="footerBottom"><span>© 2026 BITMATE. All rights reserved.</span><span>Risk warning: Digital asset trading may result in loss of principal.</span></div>
    </div></footer>
  </body></html>
}
