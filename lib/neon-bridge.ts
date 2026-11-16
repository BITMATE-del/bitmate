type NeonResponse<T>={data:T|null;error:{message:string}|null};
export async function neonRpc<T=unknown>(name:string,args:Record<string,unknown>={}):Promise<NeonResponse<T>>{
 try{
  const r=await fetch('/api/neon/rpc/'+encodeURIComponent(name),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(args),cache:'no-store'});
  const payload=await r.json();
  if(!r.ok)return {data:null,error:{message:typeof payload.error==='string'?payload.error:payload.error?.message||'요청 처리 실패'}};
  return {data:payload.data??null,error:payload.error??null};
 }catch(e){return {data:null,error:{message:e instanceof Error?e.message:'서버 연결 실패'}}}
}
export async function neonView<T=unknown>(name:string):Promise<NeonResponse<T>>{
 try{
  const r=await fetch('/api/neon/view/'+encodeURIComponent(name),{credentials:'same-origin',cache:'no-store'});
  const payload=await r.json();
  if(!r.ok)return {data:null,error:{message:typeof payload.error==='string'?payload.error:payload.error?.message||'조회 실패'}};
  return {data:payload.data??null,error:payload.error??null};
 }catch(e){return {data:null,error:{message:e instanceof Error?e.message:'서버 연결 실패'}}}
}
export async function neonIdentity(){
 try{
  const r=await fetch('/api/recovery-auth/session',{credentials:'same-origin',cache:'no-store'});
  if(!r.ok)return null;
  const x=await r.json();
  return x.user as {id:string;email:string;role:'user'|'admin'|'dealer'}|null;
 }catch{return null}
}
