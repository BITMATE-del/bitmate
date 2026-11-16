import {createClient,type SupabaseClient} from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL='https://fgyiofykvpkxpeylcocn.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY='sb_publishable_a7YWOaS5bhOcoHqHMpunKQ_-Nm-2pOC';
let browserClient:SupabaseClient|null=null;

const neonTableNames=new Set(['cfd_products','cfd_timed_trades','cfd_positions','cfd_orders','cfd_trade_executions','cfd_risk_acceptances','notices','demo_balances','futures_market_prices','crypto_loan_products','crypto_loans','p2p_ads','p2p_orders']);
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
   if(property==='from')return (table:string)=>{
    if(!neonTableNames.has(table))return target.from(table);
    const filters:Array<{field:string;operator:'eq'|'in'|'gte'|'lte';value:unknown}>=[];
    let sort:{field:string;ascending:boolean}|null=null;
    let limit=100;
    let single=false;
    const query:any={
      select(_cols='*'){return query},
      eq(field:string,value:unknown){filters.push({field,operator:'eq',value});return query},
      in(field:string,value:unknown[]){filters.push({field,operator:'in',value});return query},
      gte(field:string,value:unknown){filters.push({field,operator:'gte',value});return query},
      lte(field:string,value:unknown){filters.push({field,operator:'lte',value});return query},
      order(field:string,options?:{ascending?:boolean}){sort={field,ascending:options?.ascending!==false};return query},
      limit(n:number){if(Number.isSafeInteger(n)&&n>0)limit=Math.min(n,200);return query},
      maybeSingle(){single=true;return query},
      single(){single=true;return query},
      then(resolve:(value:any)=>unknown,reject?:(error:unknown)=>unknown){
        return fetch('/api/recovery-view/'+table,{credentials:'same-origin',cache:'no-store'})
        .then(async r=>{
          const result=await r.json().catch(()=>({data:null,error:{message:'조회 실패'}}));
          if(result.error)return {data:null,error:typeof result.error==='string'?{message:result.error}:result.error};
          let rows=Array.isArray(result.data)?result.data:[];
          for(const filter of filters){
            rows=rows.filter((item:Record<string,unknown>)=>{
              const current=item[filter.field];
              switch(filter.operator){
                case 'eq':return String(current)===String(filter.value);
                case 'in':return Array.isArray(filter.value)&&filter.value.some(v=>String(current)===String(v));
                case 'gte':return String(current)>=String(filter.value);
                case 'lte':return String(current)<=String(filter.value);
              }
            });
          }
          if(sort){const {field,ascending}=sort;rows=[...rows].sort((a:Record<string,unknown>,b:Record<string,unknown>)=>String(a[field]??'').localeCompare(String(b[field]??''),'en',{numeric:true})*(ascending?1:-1))}
          rows=rows.slice(0,limit);
          return {data:single?(rows[0]??null):rows,error:null};
        }).catch(e=>({data:null,error:{message:e instanceof Error?e.message:'Neon 조회 실패'}}))
        .then(resolve,reject);
      }
    };
    return query;
   };
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
