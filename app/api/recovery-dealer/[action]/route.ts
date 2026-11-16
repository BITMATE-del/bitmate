import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const backend='https://bitmate-auth-production.up.railway.app';
const canGet=new Set(['members']);
const canPost=new Set(['create-test','set-block','wallet-adjust']);
export async function GET(req:NextRequest,{params}:{params:Promise<{action:string}>}){return forward(req,(await params).action,'GET')}
export async function POST(req:NextRequest,{params}:{params:Promise<{action:string}>}){return forward(req,(await params).action,'POST')}
async function forward(req:NextRequest,action:string,method:'GET'|'POST'){
 const error=(message:string,status:number)=>NextResponse.json({ok:false,error:message},{status,headers:{'Cache-Control':'no-store'}});
 if(method==='GET'?!canGet.has(action):!canPost.has(action))return error('지원하지 않는 요청입니다.',404);
 const token=req.cookies.get('bm_recovery_session')?.value;
 if(!token)return error('로그인이 필요합니다.',401);
 if(method==='POST'){
  const origin=req.headers.get('origin');
  if(origin){try{if(new URL(origin).host!==req.nextUrl.host)return error('허용되지 않은 요청입니다.',403)}catch{return error('허용되지 않은 요청입니다.',403)}}
 }
 const body=method==='POST'?await req.text():undefined;
 if(body&&body.length>4096)return error('요청이 너무 큽니다.',413);
 try{
  const result=await fetch(backend+'/dealer/'+action,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body,cache:'no-store',signal:AbortSignal.timeout(10000)});
  const data=await result.json().catch(()=>({error:'총판 서버 응답 오류'}));
  return NextResponse.json(data,{status:result.status,headers:{'Cache-Control':'no-store'}});
 }catch{return error('총판 서버에 연결할 수 없습니다.',502)}
}
