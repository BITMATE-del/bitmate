import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';

const backend='https://bitmate-auth-production.up.railway.app';
const validGet=new Set(['status','summary','users']);
const validPost=new Set(['setup','create-test','set-block']);
const error=(msg:string,status:number)=>NextResponse.json({ok:false,error:msg},{status,headers:{'Cache-Control':'no-store'}});

async function forward(req:NextRequest,action:string,method:'GET'|'POST'){
 if(method==='GET'?!validGet.has(action):!validPost.has(action))return error('지원하지 않는 요청입니다.',404);
 if(method==='POST'){
  const origin=req.headers.get('origin');
  if(origin){try{if(new URL(origin).host!==req.nextUrl.host)return error('잘못된 요청입니다.',403)}catch{return error('잘못된 요청입니다.',403)}}
 }
 const headers:Record<string,string>={'Accept':'application/json'};
 const token=req.cookies.get('bm_recovery_session')?.value;
 if(action!=='status'&&action!=='setup'){
  if(!token)return error('관리자 로그인이 필요합니다.',401);
  headers.Authorization='Bearer '+token;
 }
 let body:string|undefined;
 if(method==='POST'){
  body=await req.text();
  if(body.length>4096)return error('입력 내용이 너무 큽니다.',413);
  headers['Content-Type']='application/json';
 }
 const url=backend+'/admin/'+action+(method==='GET'&&action==='users'?('?q='+encodeURIComponent((req.nextUrl.searchParams.get('q')||'').slice(0,80))):'');
 try{
  const upstream=await fetch(url,{method,headers,body,cache:'no-store',signal:AbortSignal.timeout(10000)});
  const payload=await upstream.json().catch(()=>({ok:false,error:'관리 서버 응답 오류'}));
  return NextResponse.json(payload,{status:upstream.status,headers:{'Cache-Control':'no-store'}});
 }catch{return error('관리 서버 연결에 실패했습니다.',502)}
}
export async function GET(req:NextRequest,{params}:{params:Promise<{action:string}>}){
 return forward(req,(await params).action,'GET');
}
export async function POST(req:NextRequest,{params}:{params:Promise<{action:string}>}){
 return forward(req,(await params).action,'POST');
}
