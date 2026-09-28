'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import UiIcon from './UiIcon';

const items=[
  {href:'/',label:'홈',icon:'overview'},
  {href:'/#markets',label:'마켓',icon:'market'},
  {href:'/futures',label:'거래',icon:'futures'},
  {href:'/account',label:'자산',icon:'wallet'},
  {href:'/member',label:'내정보',icon:'user'},
] as const;

export default function MobileBottomNav(){
  const pathname=usePathname();
  if(pathname.startsWith('/admin'))return null;
  const active=(href:string)=>{
    if(href==='/')return pathname==='/';
    if(href==='/#markets')return false;
    if(href==='/futures')return pathname.startsWith('/futures')||pathname.startsWith('/cfd')||pathname.startsWith('/trade/');
    return pathname.startsWith(href);
  };
  return <nav className="mobileBottomNav" aria-label="모바일 하단 내비게이션">
    {items.map(item=><Link key={item.href} href={item.href} className={active(item.href)?'active':''}>
      <UiIcon name={item.icon} size={19}/>
      <span>{item.label}</span>
    </Link>)}
  </nav>;
}
