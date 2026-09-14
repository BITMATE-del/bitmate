import './globals.css';

export const metadata={title:'BITMATE | Digital Asset Exchange',description:'Markets, trading and digital asset management in one experience'};

const nav=[['#markets','Markets'],['#trade','Trade'],['#tools','Futures'],['#tools','Tools'],['#finance','Finance'],['#campaigns','Campaigns']];

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="ko"><body id="top">
    <header className="xtHeader"><div className="xtShell xtHeaderInner">
      <a className="xtBrand" href="#home"><span className="xtLogo">B</span><b>BITMATE</b></a>
      <nav>{nav.map(([h,l])=><a key={l} href={h}>{l}<span>⌄</span></a>)}<a href="#app">More</a></nav>
      <div className="xtHeaderTools"><button className="searchPill">⌕ BTC/USDT</button><a className="loginLink" href="#home">Log in</a><a className="limeBtn headerBtn" href="#markets">Sign up</a><button className="iconBtn">↓</button><button className="iconBtn">◎</button></div>
    </div></header>
    {children}
    <footer className="xtFooter"><div className="xtShell">
      <div className="footerTop"><a className="xtBrand" href="#top"><span className="xtLogo">B</span><b>BITMATE</b></a><p>Explore digital assets with a clear, demo-first trading experience.</p></div>
      <div className="footerCols">
        <div><h4>Company</h4><a href="#home">About</a><a href="#campaigns">Campaigns</a><a href="#finance">Security</a><a href="#app">App</a></div>
        <div><h4>Product</h4><a href="#markets">Spot Trading</a><a href="#tools">Trading Tools</a><a href="#trade">AI Trading</a><a href="#app">Asset Center</a></div>
        <div><h4>Support</h4><a href="#finance">Risk Notice</a><a href="#markets">Market Status</a><a href="#finance">System Policy</a><a href="#home">Help Center</a></div>
        <div><h4>Markets</h4><a href="#markets">BTC/USDT</a><a href="#markets">ETH/USDT</a><a href="#markets">SOL/USDT</a><a href="#markets">XRP/USDT</a></div>
      </div>
      <div className="footerBottom"><span>© 2026 BITMATE. All rights reserved.</span><span>Risk warning: Digital asset trading may result in loss of principal.</span></div>
    </div></footer>
  </body></html>
}
