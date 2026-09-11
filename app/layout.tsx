import './globals.css';
import Link from 'next/link';

export const metadata={title:'BITMATE',description:'DEMO-first digital asset trading platform'};
const links=[['/','Home'],['/ai-trading','AI Trading'],['/spot','Spot'],['/quick-trade','Quick Trade'],['/demo','Demo'],['/assets','Assets'],['/admin','Admin']];

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="ko"><body>
    <header className="nav">
      <div className="topMini"><div className="wrap"><div className="badgeRow"><span className="miniBadge">DEMO 우선 운영</span><span className="miniBadge">실거래 Feature Flag 기본 OFF</span><span className="miniBadge">AI · Spot · Quick Trade</span></div><span>Digital Assets Platform</span></div></div>
      <div className="wrap navin">
        <Link href="/" className="brandMark"><span className="brandIcon">B</span><span className="brandText">BITMATE</span></Link>
        <nav className="navLinks">{links.map(([href,label])=><Link key={href} href={href} className="navLink">{label}</Link>)}</nav>
        <div className="navActions"><span className="accountPill">DEMO ACCOUNT</span><Link href="/demo" className="btn">Get Started</Link></div>
      </div>
    </header>
    {children}
    <footer className="footer"><div className="wrap footerGrid"><div className="footerCard"><h4>BITMATE</h4><p>DEMO-first 구조로 설계된 디지털자산 트레이딩 플랫폼입니다. 시장 보기, AI 전략 선택, 주문 체험, 자산 확인의 흐름을 직관적으로 제공합니다.</p></div><div className="footerCard"><h4>Products</h4><ul><li><Link href="/ai-trading">AI Trading</Link></li><li><Link href="/spot">Spot Market</Link></li><li><Link href="/quick-trade">Quick Trade</Link></li><li><Link href="/assets">Asset Center</Link></li></ul></div><div className="footerCard"><h4>Important Notice</h4><ul><li>현재 버전은 DEMO 중심 MVP입니다.</li><li>가짜 수익률 및 보장성 표현을 사용하지 않습니다.</li><li>실거래/출금은 운영 정책에 따라 별도 활성화됩니다.</li></ul></div></div><div className="wrap legal">Risk Warning: 디지털자산 거래는 원금 손실 가능성이 있습니다. 본 서비스 화면은 테스트 및 시연 목적의 DEMO 구성을 포함할 수 있으며, 실제 투자 판단 책임은 사용자에게 있습니다.</div></footer>
  </body></html>
}
