import {cookies} from 'next/headers';
import AdminOperations from '@/components/AdminOperations';
import RailwayMemberManager from '@/components/RailwayMemberManager';

export const dynamic='force-dynamic';

export default async function Page(){
  const cookieStore=await cookies();
  const token=cookieStore.get('bm_recovery_session')?.value;
  if(token){
    try{
      const response=await fetch('https://bitmate-auth-production.up.railway.app/session',{
        headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(5000)
      });
      if(response.ok){
        const session=await response.json();
        if(session?.user?.role==='admin')return <RailwayMemberManager/>;
      }
    }catch{}
  }
  return <AdminOperations/>;
}
