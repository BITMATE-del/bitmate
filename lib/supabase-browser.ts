import {createClient,type SupabaseClient} from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL='https://fgyiofykvpkxpeylcocn.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY='sb_publishable_a7YWOaS5bhOcoHqHMpunKQ_-Nm-2pOC';

let browserClient:SupabaseClient|null=null;

export function createBrowserSupabase(){
  if(browserClient)return browserClient;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||FALLBACK_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||FALLBACK_SUPABASE_PUBLISHABLE_KEY;
  browserClient=createClient(url,key);
  return browserClient;
}
