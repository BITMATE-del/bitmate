import Link from 'next/link';

type Props={
  eyebrow:string;
  title:string;
  description:string;
  badge:string;
  stats:Array<{label:string;value:string}>;
  bullets:string[];
  mode?:'spot'|'etf'|'margin'|'rwa'|'mining'|'premarket';
};

const rows=[
  ['BTC/USDT','77,259.40','-0.02%','2.18B'],
  ['ETH/USDT','2,499.43','-0.91%','1.42B'],
  ['SOL/USDT','100.49','-1.60%','824M'],
  ['XRP/USDT','1.36','-0.68%','533M'],
];

export default function TradeLanding({eyebrow,title,description,badge,stats,bullets}:Props){
  return <main className="tradePage">
    <section className="tradeHero"><div className="xtShell tradeHeroGrid">
      <div><div className="xtEyebrow"><span/>{eyebrow}</div><h1>{title}</h1><p>{description}</p><div className="tradeCtas"><Link className="limeBtn" href="/signup">Start trading</Link><Link className="secondaryTradeBtn" href="/">Back to home</Link></div><small>Digital asset trading involves market risk.</small></div>
      <div className="tradeTerminal"><div className="tradeTerminalHead"><span>{badge}</span><b>BTC / USDT</b><em>DEMO</em></div><div className="tradeTerminalBody"><div className="tradeChart"><div className="tradePrice">77,259.40 <span>-0.02%</span></div><svg viewBox="0 0 600 220" preserveAspectRatio="none"><polyline fill="none" stroke="#b9ff31" strokeWidth="4" points="0,175 45,150 85,160 130,118 170,127 210,92 250,101 295,67 335,84 375,54 425,66 470,30 520,43 600,20"/></svg></div><div className="tradeTicket"><b>Order</b><label>Type</label><div>Market</div><label>Amount</label><div>₩ 300,000</div><button>Place demo order</button></div></div></div>
    </div></section>

    <section className="tradeStats"><div className="xtShell tradeStatsGrid">{stats.map(s=><div key={s.label}><span>{s.label}</span><b>{s.value}</b></div>)}</div></section>

    <section className="tradeContent"><div className="xtShell tradeFeatureGrid">
      <div><span className="sectionLabel">BUILT FOR CLARITY</span><h2>A focused trading workspace</h2><p>시장 정보와 주문 동작을 한 화면에서 확인하고, 필요한 기능만 명확하게 노출하는 구조로 설계합니다.</p><ul>{bullets.map(x=><li key={x}>{x}</li>)}</ul></div>
      <div className="marketTable compactTable"><div className="marketRow marketHead"><span>Pair</span><span>Price</span><span>24h</span><span>Volume</span><span>Action</span></div>{rows.map(r=><div className="marketRow" key={r[0]}><span className="pair"><i>{r[0][0]}</i><b>{r[0]}</b></span><span>{r[1]}</span><span className="down">{r[2]}</span><span>{r[3]}</span><Link href="/signup">Trade</Link></div>)}</div>
    </div></section>
  </main>
}
