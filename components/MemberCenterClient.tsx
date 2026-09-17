'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {createBrowserSupabase} from '@/lib/supabase-browser';
import s from './MemberCenter.module.css';

type View='overview'|'verification'|'security'|'api'|'setting'|'referral'|'vouchers'|'subaccount';

const nav:[View,string,string][]=[
 ['overview','▦','Overview'],
 ['verification','◆','Identity Verification'],
 ['security','◉','Security Center'],
 ['api','↗','API Management'],
 ['setting','⚙','Setting'],
 ['referral','▣','Referral Rewards'],
 ['vouchers','▤','My Vouchers'],
 ['subaccount','●','Sub-account'],
];

const maskEmail=(email:string)=>{const [n,d='']=email.split('@');return d?`${n.slice(0,2)}***@${d}`:email};

export default function MemberCenterClient(){
 const supabase=createBrowserSupabase();
 const [view,setView]=useState<View>('overview');
 const [email,setEmail]=useState('');
 const [uid,setUid]=useState('');
 const [nickname,setNickname]=useState('BITMATE User');
 const [marketing,setMarketing]=useState(true);
 const [depositMail,setDepositMail]=useState(true);
 const [withdrawMail,setWithdrawMail]=useState(true);
 useEffect(()=>{
  const q=new URLSearchParams(location.search).get('view') as View|null;
  if(q&&nav.some(x=>x[0]===q))setView(q);
  supabase.auth.getUser().then(({data:{user}})=>{if(user){setEmail(user.email||'');setUid(user.id||'');setNickname((user.user_metadata?.nickname as string)||`BITMATE-${user.id.slice(0,8)}`)}});
 },[]);
 const go=(v:View)=>{setView(v);history.replaceState(null,'',`/member?view=${v}`)};
 const shortUid=useMemo(()=>uid?uid.replaceAll('-','').slice(0,14):'—',[uid]);
 const changeNick=async()=>{const next=prompt('새 닉네임을 입력하세요.',nickname)?.trim();if(!next)return;const {error}=await supabase.auth.updateUser({data:{nickname:next}});if(!error)setNickname(next)};
 return <main className={s.page}><div className={s.shell}>
  <aside className={s.side}>{nav.map(([key,icon,label])=><button key={key} className={view===key?s.active:''} onClick={()=>go(key)}><span>{icon}</span><b>{label}</b></button>)}</aside>
  <section className={s.content}>
   {view==='overview'&&<>
    <section className={s.profileBar}>
     <div className={s.avatar}/><div><strong>{nickname}</strong><span>UID: {shortUid}</span></div>
     <div><small>Sign Up</small><b>{email?maskEmail(email):'—'}</b></div>
     <div><small>Identity Verification</small><em>Unverified</em></div>
     <div><small>VIP Level</small><em>VIP 0</em></div>
     <div><small>Security</small><b>Standard</b></div>
     <div><small>Last Login</small><b>Current session</b></div>
    </section>
    <div className={s.steps}>
     <article><small>Step1</small><h2>Sign up</h2><div className={s.stepDone}>✓ Completed</div></article>
     <article className={s.focus}><small>Step2</small><h2>First Deposit ≥20 USDT</h2><p>Get Up To <strong>200 USDT</strong></p><Link href="/deposit">Deposit</Link></article>
     <article><small>Step3</small><h2>First Trade ≥20 USDT</h2><p>Get Up To <strong>200 USDT</strong></p><button disabled>To Be Unlocked</button></article>
    </div>
    <div className={s.overviewGrid}>
     <section className={s.balanceCard}><span>Est. Total Value</span><strong>0 <small>BTC</small></strong><p>≈ $0.00</p><p>Today's PNL <em>$0.00(0%)</em></p><div className={s.actions}><Link href="/deposit">Deposit</Link><Link href="/#markets">Buy</Link><button>Withdraw</button><button>Transfer</button></div></section>
     <section className={s.sideCard}><h3>Your VIP 0 benefits</h3><div><span>Low Rate</span><span>High Return</span><span>VIP Support</span></div></section>
     <section className={s.marketCard}><div className={s.cardTitle}><h2>Markets</h2><Link href="/markets">View ›</Link></div><div className={s.tabs}><span>Holding Coins</span><span>Fav</span><b>Hot</b><span>New Coin</span><span>Top Gainers</span></div>{[['BTC/USDT','76,526.10','+0.77%'],['ETH/USDT','2,499.00','+0.42%'],['SOL/USDT','100.49','+1.18%']].map(r=><div className={s.marketRow} key={r[0]}><b>{r[0]}</b><span>{r[1]}</span><em>{r[2]}</em><Link href="/futures">Trade</Link></div>)}</section>
     <section className={s.sideCard}><h3>Referral Rewards</h3><p>Invite friends and review your referral activity.</p><button onClick={()=>go('referral')}>View Rewards</button></section>
    </div>
   </>}

   {view==='verification'&&<section className={s.plain}>
    <div className={s.pageTitle}><h2>Personal Verification</h2><span>Unverified</span></div>
    <div className={s.country}>Country/Region <strong>🇰🇷 South Korea (대한민국)</strong></div>
    <h3>Identity Verification</h3>
    <ul className={s.notes}><li>Photo and video authentication</li><li>Account security and identity checks</li><li>Review period: typically within 2 days after submission</li></ul>
    <button className={s.green}>Verify Now</button>
    <div className={s.limitGrid}><div><b>Fiat</b><span>Deposit: No Limit</span><span>Withdraw: 500,000 USD/Day</span></div><div><b>Cryptocurrency</b><span>Deposit: No Limit</span><span>Withdraw: 10,000,000 USDT/Day</span></div></div>
   </section>}

   {view==='security'&&<section className={s.plain}>
    <div className={s.pageTitle}><h2>Identity Two-factor Authentication</h2><span>Security Level · Standard</span></div>
    <SecurityRow icon="G" title="Google Authenticator (Recommended)" state="Not enabled" action="Connect" desc="Used for security verification while logging in, withdrawing assets, retrieving your password, and managing security settings."/>
    <SecurityRow icon="✉" title="Email Address" state="Activated" action="Change" desc={email?maskEmail(email):'Email security verification'}/>
    <SecurityRow icon="▣" title="Phone Number" state="Not enabled" action="Connect" desc="Used as an additional account verification method."/>
    <SecurityRow icon="⌘" title="Passkey" state="Not enabled" action="Setting" desc="Use a device passkey for login and withdrawal verification."/>
    <h3 className={s.sectionTitle}>Withdrawal Settings</h3><SecurityRow icon="↗" title="Quick Withdrawal" action="Setting" desc="Configure trusted addresses and withdrawal verification preferences."/>
    <h3 className={s.sectionTitle}>Password Setting</h3><SecurityRow icon="▣" title="Login Password" state="Password strength: High" action="Change" desc="Used for signing in and protecting account settings."/>
    <SecurityRow icon="◇" title="Anti-Phishing Code" action="Setting" desc="Add a code to official account emails to help identify fraudulent messages."/>
    <h3 className={s.sectionTitle}>Account Management</h3><SecurityRow icon="▤" title="Third-party Account" action="View" desc="Review linked sign-in providers."/><SecurityRow icon="◉" title="Delete Account" action="Delete" desc="Account deletion requires identity and security verification."/>
    <div className={s.log}><h3>Login Log</h3><div className={s.logHead}><span>Time</span><span>Action Type</span><span>Operating Terminal</span><span>Result</span></div><div className={s.logRow}><span>Current session</span><span>Log In</span><span>web</span><span>Success</span></div></div>
   </section>}

   {view==='api'&&<section className={s.plain}><div className={s.pageTitle}><h2>API Management</h2><button className={s.green}>Create API</button></div><p className={s.muted}>API keys for trading integrations will be displayed here. Secret keys are shown only once when created.</p><div className={s.empty}>No API keys</div></section>}

   {view==='setting'&&<section className={s.plain}>
    <h2>My Profile</h2>
    <SettingRow icon="✎" title="Nickname" desc="Set a custom nickname for your profile." value={nickname} action="Change" onClick={changeNick}/>
    <SettingRow icon="●" title="Avatar" desc="Select an avatar to personalize your account." value="Default" action="Change"/>
    <SettingRow icon="▣" title="Superior Referral Code" desc="Your upstream referral information." value="—"/>
    <h3 className={s.sectionTitle}>Notification Settings</h3>
    <SettingRow icon="●" title="Notification Language" desc="Select the language used for account notifications." value="한국어 / English" action="Change"/>
    <ToggleRow title="Marketing Emails" desc="Receive promotional and service marketing emails." value={marketing} setValue={setMarketing}/>
    <ToggleRow title="Deposit Confirmation Email" desc="Receive an email after a deposit is credited." value={depositMail} setValue={setDepositMail}/>
    <ToggleRow title="Withdrawal Success Email" desc="Receive an email after a withdrawal completes." value={withdrawMail} setValue={setWithdrawMail}/>
   </section>}

   {view==='referral'&&<section className={s.plain}><div className={s.pageTitle}><h2>Referral Rewards</h2><Link className={s.greenLink} href="/more/referral">Open Referral Center</Link></div><div className={s.stat3}><div><span>Total referrals</span><strong>0</strong></div><div><span>Pending rewards</span><strong>0 USDT</strong></div><div><span>Claimed rewards</span><strong>0 USDT</strong></div></div><div className={s.empty}>No referral activity yet</div></section>}
   {view==='vouchers'&&<section className={s.plain}><div className={s.pageTitle}><h2>My Vouchers</h2><Link className={s.greenLink} href="/more/reward-hub">Rewards Hub</Link></div><div className={s.stat3}><div><span>Available</span><strong>0</strong></div><div><span>Used</span><strong>0</strong></div><div><span>Expired</span><strong>0</strong></div></div><div className={s.empty}>No vouchers</div></section>}
   {view==='subaccount'&&<section className={s.plain}><div className={s.pageTitle}><h2>Sub-account</h2><button className={s.green}>Create Sub-account</button></div><p className={s.muted}>Create isolated account profiles for strategy or operational separation. Asset transfers remain subject to account permissions.</p><div className={s.empty}>No sub-accounts</div></section>}
  </section>
 </div></main>
}

function SecurityRow({icon,title,state,action,desc}:{icon:string,title:string,state?:string,action:string,desc:string}){return <div className={s.securityRow}><i>{icon}</i><div><div><b>{title}</b>{state&&<em>{state}</em>}</div><p>{desc}</p></div><button>{action}</button></div>}
function SettingRow({icon,title,desc,value,action,onClick}:{icon:string,title:string,desc:string,value:string,action?:string,onClick?:()=>void}){return <div className={s.settingRow}><i>{icon}</i><div><b>{title}</b><p>{desc}</p></div><span>{value}</span>{action&&<button onClick={onClick}>{action}</button>}</div>}
function ToggleRow({title,desc,value,setValue}:{title:string,desc:string,value:boolean,setValue:(v:boolean)=>void}){return <div className={s.settingRow}><i>●</i><div><b>{title}</b><p>{desc}</p></div><button className={`${s.toggle} ${value?s.on:''}`} onClick={()=>setValue(!value)} aria-label={`${title} toggle`}><span/></button></div>}
