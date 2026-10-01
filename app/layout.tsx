import './globals.css';
import './mobile.css';
import './hero.css';
import './mining.css';
import './brand.css';
import './ui-fixes.css';
import SiteChrome from '@/components/SiteChrome';
import SiteDialog from '@/components/SiteDialog';
import NativeBridge from '@/components/NativeBridge';

export const viewport={width:'device-width',initialScale:1,viewportFit:'cover'};

export const metadata={
  title:'BITMATE | AI · CFD · ETF · Mining',
  description:'AI trading, CFD margin, Crypto ETF and Crypto Mining in one digital asset platform',
  icons:{icon:'/assets/brand/bitmate-symbol.png',shortcut:'/assets/brand/bitmate-symbol.png',apple:'/assets/brand/bitmate-symbol.png'}
};

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="ko"><body id="top"><SiteChrome>{children}</SiteChrome><NativeBridge/><SiteDialog/></body></html>;
}
