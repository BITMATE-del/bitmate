import {cookies} from 'next/headers';
import AdminNoticesClient from '@/components/AdminNoticesClient';
import RailwayNoticesClient from '@/components/RailwayNoticesClient';
export const dynamic='force-dynamic';
export default async function Page(){
 const token=(await cookies()).get('bm_recovery_session')?.value;
 if(token){
  try{
   const r=await fetch('https://bitmate-auth-production.up.railway.app/session',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(5000)});
   if(r.ok){
    const data=await r.json();
    if(data?.user?.role==='admin')return <RailwayNoticesClient/>;
   }
  }catch{}
 }
 return <AdminNoticesClient/>;
}
