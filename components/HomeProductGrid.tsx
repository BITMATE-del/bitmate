'use client';

import Link from 'next/link';
import {useState} from 'react';
import UiIcon,{type UiIconName} from './UiIcon';

type Product={icon:UiIconName;title:string;copy:string;href:string};

export default function HomeProductGrid({products}:{products:Product[]}){
  const [selected,setSelected]=useState(products[0]?.title||'');

  return <div className="productGrid">
    {products.map(p=>{
      const active=selected===p.title;
      return <Link
        key={p.title}
        href={p.href}
        aria-current={active?'page':undefined}
        className={active?'productCard active':'productCard'}
        onPointerDown={()=>setSelected(p.title)}
        onFocus={()=>setSelected(p.title)}
      >
        <div className="productIcon"><UiIcon name={p.icon} size={23}/></div>
        <div><h3>{p.title}</h3><p>{p.copy}</p></div>
        <span className="arrowLink" aria-hidden="true" style={{display:'grid',placeItems:'center'}}><UiIcon name="chevronRight" size={16}/></span>
      </Link>
    })}
  </div>;
}
