import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'';
const anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
const service=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const json=(message:string,status:number)=>NextResponse.json({ok:false,error:message},{status,headers:{'Cache-Control':'no-store'}});

export async function POST(req:NextRequest){
  if(!url||!anon||!service)return json('서버 관리자 키가 설정되지 않았습니다. SUPABASE_SERVICE_ROLE_KEY를 Production 환경에 설정하세요.',503);
  const authorization=req.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer '))return json('로그인이 필요합니다.',401);
  const supabase=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
  const caller=createClient(url,anon,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:{user},error:authError}=await caller.auth.getUser(authorization.slice(7));
  if(authError||!user)return json('유효하지 않은 로그인입니다.',401);
  const role=String(user.app_metadata?.role||'').toLowerCase();
  const isAdmin=role==='admin'||role==='superadmin'||user.app_metadata?.superadmin===true;
  const {data:dealer}=await supabase.from('dealer_codes').select('id,code,active').eq('owner_user_id',user.id).eq('active',true).maybeSingle();
  if(!isAdmin&&!dealer)return json('테스트 계정 발급 권한이 없습니다.',403);
  const body=await req.json().catch(()=>null);
  const email=String(body?.email||'').trim().toLowerCase();
  const password=String(body?.password||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return json('올바른 테스트용 이메일을 입력하세요.',400);
  if(password.length<12||password.length>128)return json('비밀번호는 12~128자로 입력하세요.',400);
  const signupCode=dealer?.code||'';
  const {data:created,error:createError}=await supabase.auth.admin.createUser({
    email,password,email_confirm:true,
    user_metadata:{is_test_account:true,signup_code:signupCode,created_by_operator:user.id},
    app_metadata:{is_test_account:true}
  });
  if(createError||!created.user)return json('계정 생성 실패: '+(createError?.message||'unknown'),400);
  const id=created.user.id;
  // Dealer accounts must be scoped via the existing signup-code trigger.
  if(dealer){
    const {data:assigned,error:linkError}=await supabase.from('dealer_members').select('id').eq('user_id',id).eq('dealer_code_id',dealer.id).maybeSingle();
    if(linkError||!assigned){
      await supabase.auth.admin.deleteUser(id);
      return json('총판 회원 연결에 실패하여 발급을 취소했습니다.',500);
    }
  }
  const log=isAdmin
    ?await supabase.from('admin_logs').insert({admin_user_id:user.id,action:'TEST_ACCOUNT_CREATED',target_type:'user',target_id:id,after_value:{email,is_test_account:true,dealer_code:signupCode||null}})
    :await supabase.from('dealer_audit_logs').insert({dealer_code_id:dealer!.id,dealer_user_id:user.id,action:'TEST_ACCOUNT_CREATED',target_type:'user',target_id:id,payload:{email,is_test_account:true}});
  if(log.error){
    await supabase.auth.admin.deleteUser(id);
    return json('감사 로그 기록 실패로 발급을 취소했습니다.',500);
  }
  return NextResponse.json({ok:true,email,user_id:id},{headers:{'Cache-Control':'no-store'}});
}
