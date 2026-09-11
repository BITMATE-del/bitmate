import './globals.css';
import Link from 'next/link';

export const metadata={title:'BITMATE',description:'AI digital asset trading platform'};

const links=[['/spot','거래'],['/ai-trading','AI 트레이딩'],['/quick-trade','퀵 트레이드'],['/assets','자산'],['/demo','DEMO']];

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="ko"><body>
    <header className="topbar"><div className="topbar-inner">
      <div className="nav-left"><Link className="brand" href="/"><span className="brand-mark">B</span><span>BITMATE</span></Link>{links.map(([h,l])=><Link className="nav-link" key={h} href={h}>{l}</Link>)}</div>
      <div className="nav-right"><span className="mode-badge"><span className="status-dot"/> DEMO</span><Link className="login-link" href="/demo">로그인</Link><Link className="signup-btn" href="/demo">무료 시작</Link></div>
    </div></header>
    {children}
  </body></html>
}
