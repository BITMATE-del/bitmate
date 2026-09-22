'use client';

import {useEffect,useState} from 'react';
import s from './SiteDialog.module.css';

type DialogKind='alert'|'confirm'|'prompt';
type DialogPayload={
  id:string;
  kind:DialogKind;
  title?:string;
  message:string;
  defaultValue?:string;
  placeholder?:string;
  inputType?:'text'|'email'|'password'|'number';
  confirmLabel?:string;
  cancelLabel?:string;
};

type Pending={payload:DialogPayload;resolve:(value:any)=>void};

let counter=0;
const pending=new Map<string,(value:any)=>void>();

function openDialog(kind:DialogKind,message:string,defaultValue='',opts?:Partial<DialogPayload>){
  if(typeof window==='undefined')return Promise.resolve(kind==='confirm'?false:kind==='prompt'?null:undefined);
  const id=`bitmate-dialog-${++counter}`;
  return new Promise<any>(resolve=>{
    pending.set(id,resolve);
    window.dispatchEvent(new CustomEvent('bitmate:dialog',{detail:{id,kind,message,defaultValue,...opts}}));
  });
}

export const siteAlert=(message:string,opts?:Partial<DialogPayload>)=>openDialog('alert',message,'',opts) as Promise<void>;
export const siteConfirm=(message:string,opts?:Partial<DialogPayload>)=>openDialog('confirm',message,'',opts) as Promise<boolean>;
export const sitePrompt=(message:string,defaultValue='',opts?:Partial<DialogPayload>)=>openDialog('prompt',message,defaultValue,opts) as Promise<string|null>;

export default function SiteDialog(){
  const [current,setCurrent]=useState<DialogPayload|null>(null);
  const [value,setValue]=useState('');

  useEffect(()=>{
    const onDialog=(e:Event)=>{
      const detail=(e as CustomEvent<DialogPayload>).detail;
      setCurrent(detail);
      setValue(detail.defaultValue||'');
    };
    window.addEventListener('bitmate:dialog',onDialog as EventListener);
    return()=>window.removeEventListener('bitmate:dialog',onDialog as EventListener);
  },[]);

  const finish=(result:any)=>{
    if(!current)return;
    const resolve=pending.get(current.id);
    pending.delete(current.id);
    setCurrent(null);
    resolve?.(result);
  };

  if(!current)return null;

  const title=current.title||(
    current.kind==='confirm'?'확인':
    current.kind==='prompt'?'입력':'안내'
  );

  return <div className={s.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget&&current.kind!=='alert')finish(current.kind==='confirm'?false:null)}}>
    <div className={s.dialog} role="dialog" aria-modal="true">
      <div className={s.head}>
        <div><small>BITMATE</small><h3>{title}</h3></div>
        {current.kind!=='alert'&&<button onClick={()=>finish(current.kind==='confirm'?false:null)}>×</button>}
      </div>
      <div className={s.body}>
        <p>{current.message}</p>
        {current.kind==='prompt'&&<input autoFocus type={current.inputType||'text'} value={value} placeholder={current.placeholder||''} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')finish(value);if(e.key==='Escape')finish(null)}}/>}
      </div>
      <div className={s.actions}>
        {current.kind!=='alert'&&<button className={s.cancel} onClick={()=>finish(current.kind==='confirm'?false:null)}>{current.cancelLabel||'취소'}</button>}
        <button className={s.confirm} onClick={()=>finish(current.kind==='prompt'?value:current.kind==='confirm'?true:undefined)}>{current.confirmLabel||'확인'}</button>
      </div>
    </div>
  </div>;
}
