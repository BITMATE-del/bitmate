import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const backend='https://bitmate-auth-production.up.railway.app';
const fail=(error:string,status:number)=>NextResponse.json({data:null,error:{message:error}},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:NextRequest,{params}:{params:Promise<{kind:string;name:string}>}){
 const {kind,name}=await params;
 return forward(req,kind,name,'GET');
}
export async function POST(req:NextRequest,{params}:{params:Promise<{kind:string;name:string}>}){
 const {kind,name}=await params;
 return forward(req,kind,name,'POST');
}
async function forward(req:NextRequest,kind:string,name:string,method:'GET'|'POST'){
 if(!((kind==='view'&&method==='GET')||(kind==='rpc'&&method==='POST'))||!/^[a-z][a-z0-9_]{1,70}$/.test(name))return fail('허용되지 않은 요청입니다.',404);
 const token=req.cookies.get('bm_recovery_session')?.value;
 if(!token)return fail('로그인이 필요합니다.',401);
 const requestOrigin=req.headers.get('origin');
 if(method==='POST'&&requestOrigin){
   try{if(new URL(requestOrigin).host!==req.nextUrl.host)return fail('허용되지 않은 출처입니다.',403)}
   catch{return fail('허용되지 않은 출처입니다.',403)}
 }
 let body:string|undefined;
 if(method==='POST'){
   body=await req.text();
   if(body.length>10000)return fail('요청 크기 제한 초과',413);
   try{const parsed=JSON.parse(body);if(parsed===null||Array.isArray(parsed)||typeof parsed!=='object')return fail('잘못된 입력값입니다.',400)}
   catch{return fail('잘못된 JSON 형식입니다.',400)}
 }
 try{
   const upstream=await fetch(backend+'/'+kind+'/'+name,{
     method,
     headers:{Authorization:'Bearer '+token,'Accept':'application/json',...(method==='POST'?{'Content-Type':'application/json'}:{})},
     body,cache:'no-store',signal:AbortSignal.timeout(12000)
   });
   const payload=await upstream.json().catch(()=>({data:null,error:{message:'DB 서버 응답 오류'}}));
   const normalized=typeof payload.error==='string'?{...payload,error:{message:payload.error}}:payload;
   return NextResponse.json(normalized,{status:upstream.status,headers:{'Cache-Control':'no-store'}});
 }catch{return fail('Neon 서버에 연결할 수 없습니다.',502)}
}
