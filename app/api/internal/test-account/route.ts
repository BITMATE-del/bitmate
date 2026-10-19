import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://fgyiofykvpkxpeylcocn.supabase.co';
const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_a7YWOaS5bhOcoHqHMpunKQ_-Nm-2pOC';
export async function POST(req:NextRequest){
 const auth=req.headers.get('authorization')||'';
 if(!auth.startsWith('Bearer '))return NextResponse.json({error:'로그인이 필요합니다.'},{status:401});
 const body=await req.text();
 if(body.length>4096)return NextResponse.json({error:'요청이 너무 큽니다.'},{status:413});
 try{
  const result=await fetch(url+'/functions/v1/create-test-account',{
   method:'POST',headers:{'Content-Type':'application/json','Authorization':auth,'apikey':publicKey},
   body,cache:'no-store'
  });
  const data=await result.json().catch(()=>({error:'서버 응답 오류'}));
  return NextResponse.json(data,{status:result.status,headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'계정 발급 서버 연결 오류'},{status:502})}
}
