import Link from 'next/link';
import LandingMediaOverlay from './LandingMediaOverlay';
import s from './LandingProductPreview.module.css';

const candles=[
  [38,18,24,20],[52,26,18,31],[45,20,30,22],[62,25,17,35],[58,23,31,20],[72,30,19,42],[69,27,39,22],[84,32,20,49],[78,28,44,23],[91,34,21,53],[86,31,48,24],[102,36,22,58],[96,34,53,24],[112,39,25,61],[107,37,58,25],[122,42,27,66],[116,40,63,26],[130,46,28,70],[125,43,68,27],[139,48,31,73],[133,45,71,28],[146,50,33,76],[141,47,74,29],[153,52,35,79]
];

export function DesktopTradingPreview(){
  return <div className={s.desktopShell}>
    <div className={s.desktopTop}>
      <div className={s.pair}><span className={s.coin}>₿</span><div><b>BTC/USDT</b><small>USDT-M · Perpetual</small></div></div>
      <div className={s.priceBlock}><strong>76,526.10</strong><span>+0.83%</span></div>
      <div className={s.metric}><small>Mark Price</small><b>76,527.74</b></div>
      <div className={s.metric}><small>24H High</small><b>76,749.10</b></div>
      <div className={s.metric}><small>24H Low</small><b>75,025.00</b></div>
    </div>
    <div className={s.desktopBody}>
      <div className={s.chartPanel}>
        <div className={s.chartToolbar}><b>차트</b><span>1분</span><span>15분</span><span>1시간</span><span className={s.active}>15분</span><span>지표</span></div>
        <div className={s.chartArea}>
          <div className={s.ohlc}>Bitcoin / TetherUS · 15 · BITMATE <span>O 76,438.12 H 76,560.22 L 76,401.90 C 76,526.10</span></div>
          <div className={s.gridLines}/>
          <div className={s.candles}>{candles.map((c,i)=>{const up=i%3!==1;return <span key={i} className={up?s.candleUp:s.candleDown} style={{height:`${c[1]}px`,transform:`translateY(${78-c[0]/2}px)`}}><i style={{height:`${c[1]+16}px`}}/></span>})}</div>
          <div className={s.priceLine}><span>76,526.10</span></div>
          <div className={s.volume}>{candles.map((_,i)=><i key={i} className={i%3!==1?s.volUp:s.volDown} style={{height:`${8+(i%6)*4}px`}}/>)}</div>
        </div>
        <div className={s.bottomStrip}><span>Position <b>1</b></span><span>Asset <b>12,450 USDT</b></span><span>Funding <b>+0.0036%</b></span><span>Margin <b>Isolated</b></span></div>
      </div>
      <div className={s.orderPanel}>
        <div className={s.sideTabs}><button className={s.long}>Long</button><button>Short</button></div>
        <div className={s.orderTabs}><b>Market</b><span>Limit</span><span>Trigger</span></div>
        <label>Available <b>12,450.00 USDT</b></label>
        <div className={s.inputRow}><span>Amount</span><b>0.001</b><em>BTC</em></div>
        <div className={s.ratios}><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
        <div className={s.inputRow}><span>Total</span><b>76.53</b><em>USDT</em></div>
        <div className={s.previewRows}><span>Required Margin <b>7.65</b></span><span>Est. Fee <b>0.03</b></span></div>
        <button className={s.cta}>Long BTC</button>
      </div>
    </div>
  </div>
}

export function MobileAccessPreview(){
  return <div className={s.mobileStage} style={{position:'relative',overflow:'hidden'}}>
    <div className={s.phone}>
      <div className={s.phoneHeader}><b>BITMATE</b><span>● Live</span></div>
      <div className={s.balance}><small>Total assets</small><strong>₩10,000,000</strong><span>+2.18% today</span></div>
      <div className={s.miniMarket}><div><b>BTC/USDT</b><strong>76,526.10</strong></div><div className={s.spark}>{[18,22,20,29,26,35,31,42,39,49,46,55].map((h,i)=><i key={i} style={{height:h}}/>)}</div></div>
      <div className={s.quickStats}><div><small>Futures</small><b>1 Position</b></div><div><small>Mining</small><b>Boost ON</b></div><div><small>Reward</small><b>3 Available</b></div></div>
      <div className={s.assets}><span><b>BTC</b><em>0.0421</em><strong>₩4,216,000</strong></span><span><b>ETH</b><em>0.82</em><strong>₩2,941,000</strong></span><span><b>SOL</b><em>18.4</em><strong>₩1,844,000</strong></span></div>
      <div className={s.mobileNav}><b>Home</b><span>Markets</span><span>Trade</span><span>Assets</span></div>
    </div>
    <div className={s.quickAccess}>
      <div className={s.qr}><div className={s.qrGrid}>{Array.from({length:49}).map((_,i)=><i key={i} className={(i%3===0||i%7===0||[1,2,8,9,39,40,46,47].includes(i))?s.qrOn:''}/>)}</div></div>
      <small>QUICK ACCESS</small><b>Scan to open</b><p>모바일 브라우저에서 BITMATE를 바로 확인하세요.</p><Link href="/markets">Open Web App →</Link>
    </div>
    <LandingMediaOverlay slotKey="home_mobile_preview" alt="BITMATE mobile product preview"/>
  </div>
}
