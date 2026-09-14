import './globals.css';
import Link from 'next/link';
import ExchangeHeader from '@/components/ExchangeHeader';

export const metadata={title:'BITMATE | AI · CFD · ETF · Mining',description:'AI trading, CFD margin, Crypto ETF and Crypto Mining in one digital asset platform'};

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="ko"><body id="top">
    <ExchangeHeader/>
    {children}
    <footer className="xtFooter"><div className="xtShell">
      <div className="footerTop"><Link className="xtBrand" href="/"><span className="xtLogo">B</span><b>BITMATE</b></Link><p>AI Trading · CFD Margin · Crypto ETF · Crypto Mining</p></div>
      <div className="footerCols">
        <div><h4>Core Products</h4><Link href="/ai-trading">AI Trading</Link><Link href="/cfd-margin">CFD Margin</Link><Link href="/crypto-etf">Crypto ETF</Link><Link href="/crypto-mining">Crypto Mining</Link></div>
        <div><h4>Markets</h4><Link href="/#markets">Market Overview</Link><Link href="/trade/spot">Spot Market</Link><Link href="/trade/pre-market">Pre-market</Link><Link href="/more">Market Data</Link></div>
        <div><h4>Account</h4><Link href="/login">Log in</Link><Link href="/signup">Sign up</Link><Link href="/more">Asset Center</Link><Link href="/more">Security</Link></div>
        <div><h4>Support</h4><Link href="/more">Help Center</Link><Link href="/more">Risk Notice</Link><Link href="/more">System Status</Link><Link href="/more">API</Link></div>
      </div>
      <div className="footerBottom"><span>© 2026 BITMATE. All rights reserved.</span><span>Risk warning: AI, leveraged CFD, ETF and mining products may involve substantial loss risk.</span></div>
    </div></footer>
  </body></html>
}
