import {NextRequest,NextResponse} from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const backend='https://bitmate-auth-production.up.railway.app';

export async function POST(req:NextRequest,{params}:{params:Promise<{name:string}>}){
 const {name}=await params;
 const fail=(error:string,status:number)=>NextResponse.json({data:null,error:{message:error}},{status,headers:{'Cache-Control':'no-store'}});
 if(!/^[a-z][a-z0-9_]{2,70}$/.test(name))return fail('지원하지 않는 기능입니다.',404);
 const origin=req.headers.get('origin');
 if(origin){
  try{if(new URL(origin).host!==req.nextUrl.host)return fail('허용되지 않은 요청입니다.',403)}
  catch{return fail('허용되지 않은 요청입니다.',403)}
 }
 const token=req.cookies.get('bm_recovery_session')?.value;
 if(!token&&name!=='futures_markets')return fail('로그인이 필요합니다.',401);
 const raw=await req.text();
 if(raw.length>10000)return fail('요청 크기가 너무 큽니다.',413);
 try{
  const upstream=await fetch(backend+'/rpc/'+name,{
   method:'POST',
   headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},
   body:raw||'{}',cache:'no-store',signal:AbortSignal.timeout(15000)
  });
  const result=await upstream.json().catch(()=>({data:null,error:{message:'거래 서버 응답 오류'}}));
  return NextResponse.json(result,{status:upstream.status,headers:{'Cache-Control':'no-store'}});
 }catch{return fail('Neon 거래 서버에 연결할 수 없습니다.',502)}
}
