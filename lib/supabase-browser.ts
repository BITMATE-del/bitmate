import {createClient,type SupabaseClient} from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL='https://fgyiofykvpkxpeylcocn.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY='sb_publishable_a7YWOaS5bhOcoHqHMpunKQ_-Nm-2pOC';
let browserClient:SupabaseClient|null=null;

const neonRpcNames=new Set([
 'user_wallet_snapshot','spot_virtual_snapshot','spot_virtual_market_order',
 'get_cfd_account_summary','get_cfd_timed_account_summary','ensure_cfd_demo_account',
 'start_cfd_timed_trade','futures_closed_position_margins',
 'admin_ops_snapshot','admin_wallet_ops_snapshot','admin_member_services_snapshot',
 'admin_p2p_snapshot','admin_crypto_loan_snapshot_v2','admin_get_cfd_dashboard',
 'admin_dealer_snapshot','admin_set_user_usdt_balance','admin_set_user_frozen',
 'admin_set_cfd_timed_round_override','dealer_portal_snapshot','dealer_set_user_usdt_balance',
 'dealer_set_user_frozen'
]);

async function recoveryIdentity(){
 try{
  const response=await fetch('/api/recovery-auth/session',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(5500)});
  if(!response.ok)return null;
  const data=await response.json();
  if(!data?.user?.id)return null;
  const identity=data.user;
  return {
   id:String(identity.id),
   email:String(identity.email||''),
   aud:'authenticated',
   role:'authenticated',
   app_metadata:{role:identity.role,superadmin:identity.role==='admin'},
   user_metadata:{},
   created_at:new Date().toISOString()
  };
 }catch{return null}
}

export function createBrowserSupabase(){
 if(browserClient)return browserClient;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||FALLBACK_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||FALLBACK_SUPABASE_PUBLISHABLE_KEY;
 const legacy=createClient(url,key,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}
 });
 const auth=new Proxy(legacy.auth,{
  get(target,property,receiver){
   if(property==='getUser')return async()=>{
    const user=await recoveryIdentity();
    if(user)return {data:{user},error:null};
    return target.getUser();
   };
   if(property==='getSession')return async()=>{
    const user=await recoveryIdentity();
    if(user)return {data:{session:{user,access_token:'cookie-backed-session',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:''}},error:null};
    return target.getSession();
   };
   if(property==='signOut')return async()=>{
    await fetch('/api/recovery-auth/logout',{method:'POST',credentials:'same-origin'}).catch(()=>{});
    if(typeof window!=='undefined')window.dispatchEvent(new Event('bm-auth-changed'));
    return {error:null};
   };
   if(property==='onAuthStateChange')return (callback:(event:string,session:any)=>void)=>{
    let cancelled=false;
    const onChanged=async()=>{
      const user=await recoveryIdentity();
      if(!cancelled)callback(user?'SIGNED_IN':'SIGNED_OUT',user?{user,access_token:'cookie-backed-session'}:null);
    };
    if(typeof window!=='undefined'){
      window.addEventListener('bm-auth-changed',onChanged);
      void onChanged();
    }
    return {data:{subscription:{id:'bm-neon-session',callback,unsubscribe(){
      cancelled=true;
      if(typeof window!=='undefined')window.removeEventListener('bm-auth-changed',onChanged);
    }}}};
   };
   const value=Reflect.get(target,property,receiver);
   return typeof value==='function'?value.bind(target):value;
  }
 });
 const client=new Proxy(legacy,{
  get(target,property,receiver){
   if(property==='auth')return auth;
   if(property==='rpc')return (name:string,args?:Record<string,unknown>)=>{
    if(!neonRpcNames.has(name))return target.rpc(name,args);
    return fetch('/api/recovery-rpc/'+name,{
      method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(args||{})
    }).then(async response=>{
      const result=await response.json().catch(()=>({data:null,error:{message:'서버 응답 오류'}}));
      return {data:result.data??null,error:result.error??(response.ok?null:{message:'요청 처리 실패'})};
    }).catch((error:unknown)=>({data:null,error:{message:error instanceof Error?error.message:'거래 서버 연결 실패'}}));
   };
   const value=Reflect.get(target,property,receiver);
   return typeof value==='function'?value.bind(target):value;
  }
 });
 browserClient=client as SupabaseClient;
 return browserClient;
}
