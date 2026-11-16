import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const base='https://bitmate-auth-production.up.railway.app';
const cookieName='bm_recovery_session';
const allowed=new Set(['login','signup','session','logout']);
const fail=(error:string,status:number)=>NextResponse.json({ok:false,error},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:NextRequest,{params}:{params:Promise<{action:string}>}){
 const {action}=await params;
 if(action!=='session'&&action!=='wallet')return fail('요청을 처리할 수 없습니다.',405);
 const token=req.cookies.get(cookieName)?.value;
 if(!token)return fail('로그인이 필요합니다.',401);
 try{
   const reply=await fetch(base+(action==='wallet'?'/wallet/demo':'/session'),{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(7000)});
   const json=await reply.json();
   return NextResponse.json(json,{status:reply.status,headers:{'Cache-Control':'no-store'}});
 }catch{return fail('인증 서버 연결에 실패했습니다.',502)}
}
export async function POST(req:NextRequest,{params}:{params:Promise<{action:string}>}){
 const {action}=await params;
 if(!allowed.has(action)||action==='session')return fail('요청을 처리할 수 없습니다.',405);
 const origin=req.headers.get('origin');
 if(origin&&new URL(origin).host!==req.nextUrl.host)return fail('허용되지 않은 요청입니다.',403);
 const token=req.cookies.get(cookieName)?.value;
 if(action==='logout'){
   if(token){try{await fetch(base+'/logout',{method:'POST',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(7000)})}catch{}}
   const result=NextResponse.json({ok:true});
   result.cookies.set(cookieName,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
   return result;
 }
 const text=await req.text();
 if(text.length>2048)return fail('요청이 너무 큽니다.',413);
 try{
   const upstream=await fetch(base+'/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:text,cache:'no-store',signal:AbortSignal.timeout(10000)});
   const payload=await upstream.json();
   if(!upstream.ok)return NextResponse.json({ok:false,error:payload.error||'인증 처리에 실패했습니다.'},{status:upstream.status,headers:{'Cache-Control':'no-store'}});
   const response=NextResponse.json({ok:true,user:payload.user},{headers:{'Cache-Control':'no-store'}});
   response.cookies.set(cookieName,payload.token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*7});
   return response;
 }catch{return fail('인증 서버 연결에 실패했습니다.',502)}
}
