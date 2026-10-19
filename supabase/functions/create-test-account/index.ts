import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const url=Deno.env.get('SUPABASE_URL')||'';
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const anon=Deno.env.get('SUPABASE_ANON_KEY')||'';
const respond=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
Deno.serve(async req=>{
 if(req.method!=='POST')return respond({error:'method_not_allowed'},405);
 if(!url||!service||!anon)return respond({error:'서버 인증 설정을 확인하세요.'},503);
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(!token)return respond({error:'로그인이 필요합니다.'},401);
 const auth=createClient(url,anon,{auth:{persistSession:false}});
 const admin=createClient(url,service,{auth:{persistSession:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user)return respond({error:'로그인이 필요합니다.'},401);
 const role=String(user.app_metadata?.role||'').toLowerCase();
 const isAdmin=role==='admin'||role==='superadmin'||user.app_metadata?.superadmin===true;
 const {data:dealer}=await admin.from('dealer_codes').select('id,code').eq('owner_user_id',user.id).eq('active',true).maybeSingle();
 if(!isAdmin&&!dealer)return respond({error:'발급 권한이 없습니다.'},403);
 const body=await req.json().catch(()=>({}));
 const email=String(body.email||'').trim().toLowerCase();
 const password=String(body.password||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return respond({error:'올바른 이메일을 입력하세요.'},400);
 if(password.length<12||password.length>128)return respond({error:'비밀번호는 12자 이상이어야 합니다.'},400);
 const code=dealer?.code||'';
 const {data:created,error:creationError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{is_test_account:true,signup_code:code,created_by_operator:user.id},app_metadata:{is_test_account:true}});
 if(creationError||!created.user)return respond({error:creationError?.message||'생성 실패'},400);
 const id=created.user.id;
 if(dealer){
   // Explicitly connect to the issuing dealer; do not rely solely on signup triggers.
   const {error:linkError}=await admin.from('dealer_members').upsert(
     {dealer_code_id:dealer.id,user_id:id,signup_code:dealer.code},{onConflict:'user_id'}
   );
   if(linkError){await admin.auth.admin.deleteUser(id);return respond({error:'총판 코드 연결 실패'},500);}
   const {data:link}=await admin.from('dealer_members').select('dealer_code_id,signup_code').eq('user_id',id).maybeSingle();
   if(!link||link.dealer_code_id!==dealer.id){
     await admin.auth.admin.deleteUser(id);return respond({error:'총판 하위 회원 등록 검증 실패'},500);
   }
 }
 const log=isAdmin
   ?await admin.from('admin_logs').insert({admin_user_id:user.id,action:'TEST_ACCOUNT_CREATED',target_type:'user',target_id:id,after_value:{email,is_test_account:true}})
   :await admin.from('dealer_audit_logs').insert({dealer_code_id:dealer!.id,dealer_user_id:user.id,action:'TEST_ACCOUNT_CREATED',target_type:'user',target_id:id,payload:{email,is_test_account:true}});
 if(log.error){await admin.auth.admin.deleteUser(id);return respond({error:'감사 기록 실패'},500)}
 return respond({ok:true,email,user_id:id});
});
