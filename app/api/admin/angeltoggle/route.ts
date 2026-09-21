import {NextRequest,NextResponse} from 'next/server';
import {createHash,randomBytes} from 'crypto';
import {supabaseAdmin} from '@/lib/supabase';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://fgyiofykvpkxpeylcocn.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_a7YWOaS5bhOcoHqHMpunKQ_-Nm-2pOC';

async function verifyAdmin(req:NextRequest){
  const token=req.cookies.get('bm_admin_token')?.value;
  if(!token)return false;
  const r=await fetch(SUPABASE_URL+'/auth/v1/user',{
    headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+token},
    cache:'no-store',
  });
  if(!r.ok)return false;
  const user=await r.json();
  const role=String(user?.app_metadata?.role||'').toLowerCase();
  return role==='admin'||role==='superadmin'||user?.app_metadata?.superadmin===true;
}

function codeHash(code:string){
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

function makeCode(){
  const raw=randomBytes(8).toString('hex').toUpperCase();
  return 'ANGEL-'+raw.slice(0,4)+'-'+raw.slice(4,8)+'-'+raw.slice(8,12)+'-'+raw.slice(12,16);
}

async function dashboard(){
  const db=supabaseAdmin();
  const now=new Date().toISOString();
  const week=new Date(Date.now()+7*86400000).toISOString();

  const [total,active,unused,suspended,expiring,products,licenses]=await Promise.all([
    db.from('angeltoggle_licenses').select('id',{count:'exact',head:true}),
    db.from('angeltoggle_licenses').select('id',{count:'exact',head:true}).eq('status','ACTIVE'),
    db.from('angeltoggle_licenses').select('id',{count:'exact',head:true}).eq('status','UNUSED'),
    db.from('angeltoggle_licenses').select('id',{count:'exact',head:true}).eq('status','SUSPENDED'),
    db.from('angeltoggle_licenses').select('id',{count:'exact',head:true}).eq('status','ACTIVE').gte('expires_at',now).lte('expires_at',week),
    db.from('angeltoggle_license_products').select('*').eq('active',true).order('duration_days'),
    db.from('angeltoggle_licenses').select('*,angeltoggle_license_products(name)').order('created_at',{ascending:false}).limit(100),
  ]);

  return {
    counts:{
      total:total.count||0,
      active:active.count||0,
      unused:unused.count||0,
      suspended:suspended.count||0,
      expiring:expiring.count||0,
    },
    products:products.data||[],
    licenses:licenses.data||[],
  };
}

export async function GET(req:NextRequest){
  if(!(await verifyAdmin(req)))return NextResponse.json({error:'admin_required'},{status:401});
  return NextResponse.json({ok:true,...await dashboard()},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(req:NextRequest){
  if(!(await verifyAdmin(req)))return NextResponse.json({error:'admin_required'},{status:401});
  const db=supabaseAdmin();
  const body=await req.json().catch(()=>({}));
  const action=String(body?.action||'');

  if(action==='generate'){
    const productId=String(body?.product_id||'');
    const quantity=Math.min(100,Math.max(1,Number(body?.quantity||1)));
    const {data:product,error}=await db.from('angeltoggle_license_products').select('*').eq('id',productId).eq('active',true).single();
    if(error||!product)return NextResponse.json({error:'product_not_found'},{status:400});

    const codes:string[]=[];
    for(let i=0;i<quantity;i++){
      const code=makeCode();
      const {error:insertError}=await db.from('angeltoggle_licenses').insert({
        code_hash:codeHash(code),
        code_prefix:code.slice(0,10),
        product_id:product.id,
        duration_days:product.duration_days,
        max_devices:product.max_devices,
        customer_name:String(body?.customer_name||'').slice(0,120)||null,
        customer_contact:String(body?.customer_contact||'').slice(0,120)||null,
        memo:String(body?.memo||'').slice(0,500)||null,
        status:'UNUSED',
      });
      if(insertError)return NextResponse.json({error:insertError.message},{status:500});
      codes.push(code);
    }
    return NextResponse.json({ok:true,codes,...await dashboard()},{headers:{'Cache-Control':'no-store'}});
  }

  if(action==='license_action'){
    const id=String(body?.id||'');
    const command=String(body?.command||'');
    if(!id)return NextResponse.json({error:'invalid_id'},{status:400});
    const now=new Date();

    if(command==='suspend'){
      await db.from('angeltoggle_licenses').update({status:'SUSPENDED',updated_at:now.toISOString()}).eq('id',id);
    }else if(command==='resume'){
      await db.from('angeltoggle_licenses').update({status:'ACTIVE',updated_at:now.toISOString()}).eq('id',id);
    }else if(command==='revoke'){
      await db.from('angeltoggle_licenses').update({status:'REVOKED',updated_at:now.toISOString()}).eq('id',id);
    }else if(command==='extend30'){
      const {data}=await db.from('angeltoggle_licenses').select('expires_at').eq('id',id).single();
      const base=data?.expires_at&&new Date(data.expires_at)>now?new Date(data.expires_at):now;
      base.setDate(base.getDate()+30);
      await db.from('angeltoggle_licenses').update({expires_at:base.toISOString(),status:'ACTIVE',updated_at:now.toISOString()}).eq('id',id);
    }else if(command==='reset_devices'){
      await db.from('angeltoggle_license_devices').delete().eq('license_id',id);
    }else{
      return NextResponse.json({error:'unknown_command'},{status:400});
    }

    await db.from('angeltoggle_license_events').insert({
      license_id:id,
      event_type:'ADMIN_'+command.toUpperCase(),
      payload:{source:'bitmate_admin'},
    });

    return NextResponse.json({ok:true,...await dashboard()},{headers:{'Cache-Control':'no-store'}});
  }

  return NextResponse.json({error:'unknown_action'},{status:400});
}
