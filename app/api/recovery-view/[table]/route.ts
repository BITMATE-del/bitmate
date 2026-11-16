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
