'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import UiIcon,{type UiIconName} from './UiIcon';
import {useUnifiedWalletDisplay} from '@/lib/useUnifiedWalletDisplay';
import s from './WalletCenter.module.css';

type View='overview'|'spot'|'margin'|'futures'|'earn'|'copy'|'strategy'|'insurance'|'verification'|'order';

const items:[View,UiIconName,string][]=[
 ['overview','overview','Overview'],['spot','spot','Spot Account'],['margin','margin','Margin Account'],['futures','futures','Futures Account'],['earn','earn','Earn Account'],['copy','copy','Copy trading'],['strategy','strategy','Strategy Account'],['insurance','insurance','Insurance Account'],['verification','verification','Verification'],['order','order','Order'],
];

const assets=[['BTC','Bitcoin'],['ETH','Ethereum'],['USDT','Tether'],['TRX','TRON'],['SOL','Solana']];

export default function WalletCenterClient(){
 const [view,setView]=useState<View>('overview');
 useEffect(()=>{const q=new URLSearchParams(location.search).get('view') as View|null;if(q&&items.some(x=>x[0]===q))setView(q)},[]);
 const go=(v:View)=>{setView(v);history.replaceState(null,'',`/account?view=${v}`)};
 return <main className={s.page}><div className={s.shell}>
  <aside className={s.side}>{items.map(([key,icon,label])=><button key={key} onClick={()=>go(key)} className={view===key?s.active:''}><span><UiIcon name={icon} size={17}/></span><b>{label}</b>{key==='order'&&<em>›</em>}</button>)}</aside>
  <section className={s.content}>
   {view==='overview'&&<>
    <section className={s.hero}><div><small>To Be Unlocked</small><h1>First Deposit ≥ 20 USDT, Get Up to <strong>200 USDT</strong></h1><div className={s.actions}><Link href="/deposit">Deposit Now</Link><Link className={s.secondary} href="/more/reward-hub">Rewards Hub</Link></div></div><div className={s.gift}><UiIcon name="referral" size={36}/></div></section>
    <div className={s.tileGrid}>{[['Join the New User Challenge','New-user benefits and onboarding rewards.'],['100% Reserve Plan','Reserve and transparency information.'],['New User Guide','How to deposit and use BITMATE.'],['Customer Support','Help and support resources.']].map(([a,b])=><article className={s.tile} key={a}><div><b>{a}</b><p>{b}</p></div><span>→</span></article>)}</div>
    <section className={s.card}><h2>Popular Products</h2><div className={s.table}><div className={s.th}><span>Coins</span><span>Est. APR</span><span>Type</span><span>Duration</span><span>Action</span></div>{[['USDT','Flexible','Multiple','Flexible/Fixed'],['BTC','—','Spot','Flexible'],['ETH','—','Spot','Flexible']].map(r=><div className={s.tr} key={r[0]}><span><b>{r[0]}</b></span><span>{r[1]}</span><span>{r[2]}</span><span>{r[3]}</span><span><Link href="/deposit">Deposit</Link></span></div>)}</div></section>
   </>}

   {view==='spot'&&<>
    <section className={s.summary}><div><h1>Spot Account</h1><span className={s.label}>Assets Value</span><strong className={s.big}>{wallet.formatMoney(wallet.total)} <small>{wallet.unit}</small></strong><p>통합 지갑 기준</p><p>Today's PNL <em>$0.00 (0%)</em></p></div><div className={s.actions}><Link href="/deposit">Deposit</Link><Link href="/#markets">Buy</Link><Link href="/withdraw">Withdraw</Link><Link href="/transfer">Transfer</Link></div></section>
    <section className={s.card}><div className={s.toolbar}><input placeholder="Search"/><label><input type="checkbox"/> Hide 0 Asset</label><label><input type="checkbox"/> Delisted Asset</label></div><div className={s.table}><div className={s.th}><span>Token</span><span>Available</span><span>Unavailable</span><span>All</span><span>Action</span></div>{assets.map(a=><div className={s.tr} key={a[0]}><span><b>{a[0]}</b><small>{a[1]}</small></span><span>0.00000000</span><span>0.00000000</span><span>0.00000000</span><span><Link href="/deposit">Deposit</Link></span></div>)}</div></section>
   </>}

   {view==='margin'&&<><section className={s.summary}><div><h1>Margin Account</h1><div className={s.metrics}><div><span>Equity Value</span><strong>{wallet.withUnit(wallet.total)}</strong><small>통합 지갑 기준</small></div><div><span>Loan Asset Value</span><strong>{wallet.withUnit(wallet.total)}</strong><small>통합 지갑 기준</small></div></div></div><div className={s.actions}><button>Borrow</button><button>Repay</button><button>Transfer</button></div></section><section className={s.card}><div className={s.toolbar}><input placeholder="Search"/><label><input type="checkbox"/> Hide Small Assets</label></div><div className={s.table}><div className={s.th}><span>Pairs</span><span>Coins</span><span>Available</span><span>Borrow</span><span>Interest</span></div>{['BTC/USDT','ETH/USDT','TRX/USDT','XRP/USDT'].map(p=><div className={s.tr} key={p}><span><b>{p}</b></span><span>{p.split('/')[0]}<br/>USDT</span><span>0.00000000</span><span>0.00000000</span><span>0.00000000</span></div>)}</div></section></>}

   {view==='futures'&&<><section className={s.summary}><div><h1>USDT-M Futures</h1><span className={s.label}>Est. Total Value</span><strong className={s.big}>{wallet.formatMoney(wallet.total)} <small>{wallet.unit}</small></strong><p>통합 지갑 기준</p><p>Wallet Balance {wallet.withUnit(wallet.total)} · Available {wallet.withUnit(wallet.available)}</p></div><div className={s.actions}><Link href="/deposit">Deposit</Link><Link href="/futures">Trade</Link><Link href="/transfer">Transfer</Link></div></section><section className={s.card}><h2>Funds</h2><div className={s.table}><div className={s.th}><span>Token</span><span>Wallet Balance</span><span>Unrealized P/L</span><span>Equity Balance</span><span>Action</span></div><div className={s.tr}><span><b>USDT</b><small>Tether</small></span><span>{wallet.formatMoney(wallet.total)}</span><span>—</span><span>{wallet.formatMoney(wallet.total)}</span><span><Link href="/futures">Trade</Link></span></div></div></section></>}

   {view==='earn'&&<><section className={s.summary}><div><h1>Earn Account</h1><span className={s.label}>Assets Value</span><strong className={s.big}>{wallet.formatMoney(wallet.total)} <small>{wallet.unit}</small></strong><p>통합 지갑 기준</p><div className={s.metrics}><div><span>Yesterday's Profit</span><strong>0 BTC</strong></div><div><span>Total Profit</span><strong>0 BTC</strong></div></div></div><div className={s.actions}><Link href="/mining">Earn Overview</Link></div></section><section className={s.card}><div className={s.tabs}><b>Savings</b><span>On-chain Earn</span><span>Hashrate</span><span>Wealth Management</span><span>Crypto Loan</span></div><div className={s.statGrid}><div><span>Assets Value</span><strong>{wallet.withUnit(wallet.total)}</strong></div><div><span>Yesterday's Profit</span><strong>—</strong></div><div><span>Total Profit</span><strong>—</strong></div></div></section></>}

   {view==='copy'&&<><section className={s.summary}><div><h1>Copy trading</h1><span className={s.label}>Assets Value</span><strong className={s.big}>{wallet.formatMoney(wallet.total)} <small>{wallet.unit}</small></strong><p>통합 지갑 기준</p></div><div className={s.actions}><Link href="/copy-trading">Follow</Link><Link className={s.secondary} href="/my-copy">Copy trades</Link></div></section><section className={s.card}><h2>Futures</h2><div className={s.empty}>No data<Link href="/copy-trading">Go to Copy Trading</Link></div></section></>}

   {view==='strategy'&&<><section className={s.summary}><div><h1>Strategy Account</h1><span className={s.label}>Assets Value</span><strong className={s.big}>{wallet.formatMoney(wallet.total)} <small>{wallet.unit}</small></strong><p>통합 지갑 기준</p><div className={s.metrics}><div><span>Unified Wallet</span><strong>{wallet.withUnit(wallet.total)}</strong></div><div><span>Available</span><strong>{wallet.withUnit(wallet.available)}</strong></div></div></div><div className={s.actions}><Link href="/ai-core">My Bots</Link></div></section><section className={s.card}><h2>Strategy</h2>{['Spot Grid','Contract Grid','Spot Martingale','Futures Martingale'].map(x=><div className={s.strategyRow} key={x}><b>{x}</b><Link href="/ai-core">+ Create</Link></div>)}</section></>}

   {view==='insurance'&&<><section className={s.summary}><div><h1>Insurance Account</h1><span className={s.label}>Assets Value</span><strong className={s.big}>{wallet.formatMoney(wallet.total)} <small>{wallet.unit}</small></strong><p>통합 지갑 기준</p><div className={s.metrics}><div><span>Total Payouts</span><strong>0 BTC</strong></div><div><span>Pending Payouts</span><strong>0 BTC</strong></div></div></div><div className={s.actions}><Link href="/futures">Trade</Link><button>Transfer</button></div></section><div className={s.tileGrid}><article className={s.tile}><div><b>Futures Insurance</b><p>Risk protection information for eligible futures activity.</p></div></article><article className={s.tile}><div><b>Coverage Status</b><p>Coverage status and payout history are shown here.</p></div></article></div></>}

   {view==='verification'&&<section className={s.card}><h1>Verification</h1><p className={s.muted}>Account verification and reserve-related records are shown here.</p><div className={s.empty}>No data</div></section>}
   {view==='order'&&<section className={s.card}><h1>Order</h1><p className={s.muted}>Spot, Futures, CFD and other account-related order records will be consolidated here.</p><div className={s.empty}>No order data</div></section>}
  </section>
 </div></main>
}
