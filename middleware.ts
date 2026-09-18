import {NextRequest,NextResponse} from 'next/server';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://fgyiofykvpkxpeylcocn.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_a7YWOaS5bhOcoHqHMpunKQ_-Nm-2pOC';

async function verifyAdmin(token:string){
  try{
    const r=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+token},cache:'no-store'});
    if(!r.ok)return false;
    const user=await r.json();
    const role=String(user?.app_metadata?.role||'').toLowerCase();
    return role==='admin'||role==='superadmin'||user?.app_metadata?.superadmin===true;
  }catch{return false}
}

export async function middleware(req:NextRequest){
  const {pathname}=req.nextUrl;
  if(!pathname.startsWith('/admin'))return NextResponse.next();

  const headers=new Headers(req.headers);
  headers.set('x-robots-tag','noindex, nofollow, noarchive');
  headers.set('cache-control','no-store');

  if(pathname==='/admin/login'){
    const res=NextResponse.next({request:{headers}});
    res.headers.set('X-Frame-Options','DENY');
    res.headers.set('Referrer-Policy','no-referrer');
    res.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    return res;
  }

  const token=req.cookies.get('bm_admin_token')?.value;
  if(!token||!(await verifyAdmin(token))){
    const url=req.nextUrl.clone();
    url.pathname='/admin/login';
    url.searchParams.set('next',pathname);
    const res=NextResponse.redirect(url);
    res.cookies.delete('bm_admin_token');
    return res;
  }

  const res=NextResponse.next({request:{headers}});
  res.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  res.headers.set('Cache-Control','no-store, private');
  res.headers.set('X-Frame-Options','DENY');
  res.headers.set('Referrer-Policy','no-referrer');
  res.headers.set('X-Content-Type-Options','nosniff');
  res.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.headers.set('Cross-Origin-Opener-Policy','same-origin');
  return res;
}

export const config={matcher:['/admin/:path*']};
