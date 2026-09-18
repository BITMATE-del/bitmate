import {NextRequest,NextResponse} from 'next/server';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://fgyiofykvpkxpeylcocn.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_a7YWOaS5bhOcoHqHMpunKQ_-Nm-2pOC';

export async function POST(req:NextRequest){
  const body=await req.json().catch(()=>({}));
  const token=String(body?.access_token||'');
  if(!token)return NextResponse.json({error:'missing_token'},{status:400});

  const r=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+token},cache:'no-store'});
  if(!r.ok)return NextResponse.json({error:'invalid_session'},{status:401});
  const user=await r.json();
  const role=String(user?.app_metadata?.role||'').toLowerCase();
  const allowed=role==='admin'||role==='superadmin'||user?.app_metadata?.superadmin===true;
  if(!allowed)return NextResponse.json({error:'admin_required'},{status:403});

  const res=NextResponse.json({ok:true,email:user.email,role:user?.app_metadata?.superadmin===true?'superadmin':role});
  res.cookies.set('bm_admin_token',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/admin',maxAge:60*60*8});
  res.headers.set('Cache-Control','no-store');
  return res;
}

export async function DELETE(){
  const res=NextResponse.json({ok:true});
  res.cookies.set('bm_admin_token','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/admin',maxAge:0});
  return res;
}
