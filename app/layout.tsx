import './globals.css';
import './mobile.css';
import './hero.css';
import './mining.css';
import './brand.css';
import './ui-fixes.css';
import SiteChrome from '@/components/SiteChrome';
import SiteDialog from '@/components/SiteDialog';

export const metadata={
  title:'BITMATE | AI · CFD · ETF · Mining',
  description:'AI trading, CFD margin, Crypto ETF and Crypto Mining in one digital asset platform',
  icons:{icon:'/bitmate-icon.svg',shortcut:'/bitmate-icon.svg',apple:'/bitmate-icon.svg'}
};

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="ko"><body id="top"><SiteChrome>{children}</SiteChrome><SiteDialog/></body></html>;
}
