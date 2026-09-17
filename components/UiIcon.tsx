import type {ReactNode} from 'react';

export type UiIconName =
  | 'overview' | 'spot' | 'margin' | 'futures' | 'earn' | 'copy' | 'strategy' | 'insurance' | 'verification' | 'order'
  | 'security' | 'api' | 'settings' | 'referral' | 'voucher' | 'subaccount'
  | 'mail' | 'phone' | 'passkey' | 'withdraw' | 'password' | 'phishing' | 'link' | 'delete'
  | 'edit' | 'avatar' | 'language' | 'notification' | 'wallet' | 'user' | 'bell' | 'download' | 'globe'
  | 'campaign' | 'listing' | 'bot' | 'priceAlert';

type Props={name:UiIconName;size?:number;className?:string};

export default function UiIcon({name,size=18,className}:Props){
  const common={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true,className};
  const icon:Record<UiIconName,ReactNode>={
    overview:<><rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><rect x="14" y="14" width="6" height="6" rx="1.2"/></>,
    spot:<><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.4"/></>,
    margin:<><path d="M5 18v-4"/><path d="M10 18V9"/><path d="M15 18V5"/><path d="M20 18V11"/></>,
    futures:<><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    earn:<><ellipse cx="12" cy="6" rx="6.5" ry="2.7"/><path d="M5.5 6v5c0 1.5 2.9 2.7 6.5 2.7s6.5-1.2 6.5-2.7V6"/><path d="M5.5 11v5c0 1.5 2.9 2.7 6.5 2.7s6.5-1.2 6.5-2.7v-5"/></>,
    copy:<><circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9.5" r="2.3"/><path d="M3.5 19c.5-3.5 2.6-5.5 5.5-5.5s5 2 5.5 5.5"/><path d="M14.2 14.2c2.8.2 4.7 1.7 5.3 4.8"/></>,
    strategy:<><path d="M4 17l5-6 4 3 7-8"/><path d="M16 6h4v4"/></>,
    insurance:<><path d="M12 3l7 3v5c0 4.7-2.7 8-7 10-4.3-2-7-5.3-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    verification:<><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4"/><path d="m9 14 2 2 4-4"/></>,
    order:<><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h6"/></>,
    security:<><path d="M12 3l7 3v5c0 4.7-2.7 8-7 10-4.3-2-7-5.3-7-10V6l7-3Z"/><circle cx="12" cy="11" r="1.8"/><path d="M12 13v3"/></>,
    api:<><path d="m9 7-5 5 5 5"/><path d="m15 7 5 5-5 5"/><path d="M13 4 11 20"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.5 1A7 7 0 0 0 14.7 6L14 3h-4l-.7 3a7 7 0 0 0-1.7 1L5.1 6l-2 3.4 2 1.6a7 7 0 0 0 0 2L3.1 14.6l2 3.4 2.5-1a7 7 0 0 0 1.7 1L10 21h4l.7-3a7 7 0 0 0 1.7-1l2.5 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z"/></>,
    referral:<><path d="M4 10h16v10H4z"/><path d="M12 10v10M4 13h16"/><path d="M12 10H8.5a2.5 2.5 0 1 1 2.1-3.9L12 8l1.4-1.9A2.5 2.5 0 1 1 15.5 10H12Z"/></>,
    voucher:<><path d="M4 7a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-4V7Z"/><path d="M12 7v10"/></>,
    subaccount:<><circle cx="12" cy="8" r="3"/><path d="M5.5 19c.8-3.7 3-5.5 6.5-5.5s5.7 1.8 6.5 5.5"/></>,
    mail:<><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/></>,
    phone:<><rect x="7.5" y="3" width="9" height="18" rx="2"/><path d="M10 6h4M11 18h2"/></>,
    passkey:<><circle cx="8" cy="10" r="3"/><path d="M10.5 11.5 20 21M15 16l2-2M17 18l2-2"/></>,
    withdraw:<><circle cx="8" cy="12" r="4"/><path d="M12 12h8M17 9l3 3-3 3"/></>,
    password:<><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1"/></>,
    phishing:<><path d="M12 3l7 3v5c0 4.7-2.7 8-7 10-4.3-2-7-5.3-7-10V6l7-3Z"/><path d="M9 12h6M12 9v6"/></>,
    link:<><path d="M9.5 14.5 7 17a3.5 3.5 0 1 1-5-5l3-3a3.5 3.5 0 0 1 5 0"/><path d="m14.5 9.5 2.5-2.5a3.5 3.5 0 1 1 5 5l-3 3a3.5 3.5 0 0 1-5 0"/><path d="m8 12 8 0"/></>,
    delete:<><path d="M6 7h12M9 7V4h6v3M8 7l1 13h6l1-13"/><path d="M10.5 10v7M13.5 10v7"/></>,
    edit:<><path d="m4 16 0 4 4 0L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/></>,
    avatar:<><circle cx="12" cy="8" r="3"/><path d="M5.5 19c.8-3.7 3-5.5 6.5-5.5s5.7 1.8 6.5 5.5"/><circle cx="18" cy="6" r="2"/></>,
    language:<><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.5 3.4 5.3 3.4 8.5S14.3 18 12 20.5M12 3.5C9.7 6 8.6 8.8 8.6 12S9.7 18 12 20.5"/></>,
    notification:<><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 5.4 2 7H4.5c0-1.6 2-2 2-7Z"/><path d="M9.7 19a2.6 2.6 0 0 0 4.6 0"/></>,
    wallet:<><path d="M4 7.5h13.5A2.5 2.5 0 0 1 20 10v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17V7.5Z"/><path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H17"/><path d="M15 13.5h5"/></>,
    user:<><circle cx="12" cy="8" r="3.3"/><path d="M5.5 19c.9-3.4 3.2-5.2 6.5-5.2s5.6 1.8 6.5 5.2"/></>,
    bell:<><path d="M6.5 9.8a5.5 5.5 0 0 1 11 0c0 5 2.1 5.2 2.1 6.7H4.4c0-1.5 2.1-1.7 2.1-6.7Z"/><path d="M9.7 19a2.6 2.6 0 0 0 4.6 0"/></>,
    download:<><path d="M12 4v10"/><path d="m8.5 10.5 3.5 3.5 3.5-3.5"/><path d="M5 19h14"/></>,
    globe:<><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4"/><path d="M12 3.5c2.2 2.4 3.3 5.2 3.3 8.5S14.2 18.1 12 20.5"/><path d="M12 3.5C9.8 5.9 8.7 8.7 8.7 12s1.1 6.1 3.3 8.5"/></>,
    campaign:<><path d="M4 13h4l8 5V6l-8 5H4z"/><path d="M8 13v5"/></>,
    listing:<><path d="M5 5h14v14H5z"/><path d="M8 9h8M8 13h8M8 17h5"/></>,
    bot:<><rect x="5" y="7" width="14" height="12" rx="3"/><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6"/></>,
    priceAlert:<><path d="M6.5 9.8a5.5 5.5 0 0 1 11 0c0 5 2.1 5.2 2.1 6.7H4.4c0-1.5 2.1-1.7 2.1-6.7Z"/><path d="M9.7 19a2.6 2.6 0 0 0 4.6 0"/><path d="M18 5l2-2"/></>,
  };
  return <svg {...common}>{icon[name]}</svg>;
}
