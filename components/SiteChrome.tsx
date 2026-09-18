'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import ExchangeHeader from '@/components/ExchangeHeader';

export default function SiteChrome({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const isAdmin=pathname.startsWith('/admin');
  if(isAdmin)return <>{children}</>;
  return <>
    <ExchangeHeader/>
    {children}
    <footer className="xtFooter"><div className="xtShell">
      <div className="footerTop"><Link className="xtBrand" href="/"><span className="xtLogo">B</span><b>BITMATE</b></Link><p>AI Trading · CFD Margin · Crypto ETF · Crypto Mining</p></div>
      <div className="footerCols">
        <div><h4>Core Products</h4><Link href="/ai-trading">AI Trading</Link><Link href="/cfd-margin">CFD Margin</Link><Link href="/crypto-etf">Crypto ETF</Link><Link href="/mining">Mining</Link></div>
        <div><h4>Mining</h4><Link href="/mining">Mining Core</Link><Link href="/my-mining">My Mining</Link><Link href="/my-mining">Mining History</Link></div>
        <div><h4>Account</h4><Link href="/login">Log in</Link><Link href="/signup">Sign up</Link><Link href="/more">Asset Center</Link><Link href="/more">Security</Link></div>
        <div><h4>Support</h4><Link href="/more">Help Center</Link><Link href="/more">Risk Notice</Link><Link href="/more">System Status</Link><Link href="/more">API</Link></div>
      </div>
      <div className="footerBottom"><span>© 2026 BITMATE. All rights reserved.</span><span>Risk warning: AI, leveraged CFD, ETF and mining products may involve substantial loss risk.</span></div>
    </div></footer>
  </>;
}
