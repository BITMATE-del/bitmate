import './globals.css';

export const metadata={title:'BITMATE Trading Platform',description:'Unified digital asset trading platform'};

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="ko"><body id="top">
    <header className="header">
      <div className="shell headerInner">
        <a href="#top" className="brand"><span className="brandMark">B</span><b>BITMATE</b></a>
        <nav><a href="#platform">Platform</a><a href="#markets">Markets</a><a href="#demo">Demo</a><a href="#faq">Learn</a></nav>
        <div className="headerActions"><a className="login" href="#demo">Demo</a><a className="primary compact" href="#demo">Get started</a></div>
      </div>
    </header>
    {children}
    <footer><div className="shell footerGrid"><div><a href="#top" className="brand"><span className="brandMark">B</span><b>BITMATE</b></a><p>Unified digital asset trading experience.</p></div><div><h4>Platform</h4><a href="#platform">Overview</a><a href="#markets">Markets</a><a href="#demo">Demo</a></div><div><h4>Important</h4><p>본 서비스는 현재 개발/DEMO 단계입니다. 실거래 기능은 별도 검토 후 활성화됩니다.</p></div></div><div className="shell copyright">© 2026 BITMATE. Digital assets involve risk.</div></footer>
  </body></html>
}
