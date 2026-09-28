'use client';

import {useState} from 'react';
import UiIcon,{type UiIconName} from './UiIcon';

type Product={icon:UiIconName;title:string;copy:string};

export default function HomeProductGrid({products}:{products:Product[]}){
  const [selected,setSelected]=useState(products[0]?.title||'');

  const choose=(title:string)=>setSelected(title);
  const onKey=(e:React.KeyboardEvent<HTMLElement>,title:string)=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(title)}
  };

  return <div className="productGrid">
    {products.map(p=>{
      const active=selected===p.title;
      return <article
        key={p.title}
        role="button"
        tabIndex={0}
        aria-pressed={active}
        className={active?'productCard active':'productCard'}
        onClick={()=>choose(p.title)}
        onKeyDown={e=>onKey(e,p.title)}
      >
        <div className="productIcon"><UiIcon name={p.icon} size={23}/></div>
        <div><h3>{p.title}</h3><p>{p.copy}</p></div>
        <span className="arrowLink" aria-hidden="true" style={{display:'grid',placeItems:'center'}}><UiIcon name="chevronRight" size={16}/></span>
      </article>
    })}
  </div>;
}
