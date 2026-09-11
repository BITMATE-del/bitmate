import './globals.css';
import Link from 'next/link';
export const metadata={title:'Astra Digital Assets',description:'DEMO-first digital asset trading platform'};
const links=[['/','HOME'],['/ai-trading','AI TRADING'],['/quick-trade','QUICK TRADE'],['/spot','SPOT'],['/demo','DEMO'],['/assets','ASSETS'],['/admin','ADMIN']];
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body><nav className="nav"><div className="navin"><Link className="brand" href="/">ASTRA</Link>{links.map(([h,l])=><Link className="pill" key={h} href={h}>{l}</Link>)}<span className="pill">DEMO ACCOUNT</span></div></nav>{children}</body></html>}
