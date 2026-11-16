import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const r=await fetch('https://bitmate-auth-production.up.railway.app/notices',{cache:'no-store',signal:AbortSignal.timeout(7000)});
  if(!r.ok)throw new Error('notice_backend_unavailable');
  const data=await r.json();
  return NextResponse.json({notices:data.notices||[]},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({notices:[],error:'현재 공지를 불러올 수 없습니다.'},{status:502,headers:{'Cache-Control':'no-store'}})}
}
