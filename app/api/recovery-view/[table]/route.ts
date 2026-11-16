import {NextRequest,NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const backend='https://bitmate-auth-production.up.railway.app';
export async function GET(req:NextRequest,{params}:{params:Promise<{table:string}>}){
 const {table}=await params;
 const error=(msg:string,status:number)=>NextResponse.json({data:null,error:{message:msg}},{status,headers:{'Cache-Control':'no-store'}});
 if(!/^[a-z][a-z0-9_]{2,60}$/.test(table))return error('잘못된 조회입니다.',404);
 const token=req.cookies.get('bm_recovery_session')?.value;
 if(!token)return error('로그인이 필요합니다.',401);
 try{
  const r=await fetch(backend+'/view/'+table,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(10000)});
  const payload=await r.json().catch(()=>({data:null,error:{message:'조회 서버 응답 오류'}}));
  return NextResponse.json(payload,{status:r.status,headers:{'Cache-Control':'no-store'}});
 }catch{return error('Neon 데이터 조회에 실패했습니다.',502)}
}

export async function POST(req:NextRequest,{params}:{params:Promise<{table:string}>}){
 const {table}=await params;
 const fail=(message:string,status:number)=>NextResponse.json({data:null,error:{message}},{status,headers:{'Cache-Control':'no-store'}});
 if(table!=='cfd_risk_acceptances')return fail('지원하지 않는 요청입니다.',404);
 const origin=req.headers.get('origin');
 if(origin){
  try{if(new URL(origin).host!==req.nextUrl.host)return fail('허용되지 않은 요청입니다.',403)}
  catch{return fail('허용되지 않은 요청입니다.',403)}
 }
 const token=req.cookies.get('bm_recovery_session')?.value;
 if(!token)return fail('로그인이 필요합니다.',401);
 const raw=await req.text();
 if(raw.length>1024)return fail('요청 크기가 너무 큽니다.',413);
 try{
  const r=await fetch(backend+'/view/'+table,{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:raw,cache:'no-store',signal:AbortSignal.timeout(10000)
  });
  const payload=await r.json().catch(()=>({error:'오류 응답'}));
  return NextResponse.json(payload,{status:r.status,headers:{'Cache-Control':'no-store'}});
 }catch{return fail('서버 연결 실패',502)}
}
