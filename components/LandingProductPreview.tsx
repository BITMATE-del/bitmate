import LandingMediaOverlay from './LandingMediaOverlay';
import QrFloatingCard from './QrFloatingCard';
import { mobilePromo } from '@/lib/mobilePromo';
import s from './LandingProductPreview.module.css';

const candles=[
  {o:58,c:78,h:90,l:48,v:22},{o:76,c:92,h:101,l:67,v:26},{o:90,c:82,h:98,l:72,v:18},{o:80,c:106,h:114,l:74,v:30},
  {o:104,c:118,h:129,l:97,v:38},{o:116,c:108,h:124,l:99,v:24},{o:106,c:132,h:140,l:101,v:34},{o:130,c:146,h:154,l:122,v:44},
  {o:144,c:136,h:150,l:127,v:29},{o:134,c:121,h:141,l:111,v:33},{o:119,c:101,h:126,l:91,v:48},{o:99,c:125,h:134,l:94,v:37},
  {o:123,c:151,h:159,l:116,v:42},{o:149,c:139,h:158,l:130,v:27},{o:137,c:162,h:170,l:131,v:32},{o:160,c:154,h:168,l:144,v:24},
  {o:152,c:177,h:188,l:147,v:51},{o:175,c:166,h:182,l:157,v:36},{o:164,c:184,h:193,l:158,v:41},{o:182,c:171,h:189,l:165,v:33},
  {o:169,c:191,h:204,l:163,v:46},{o:189,c:181,h:197,l:173,v:29},{o:179,c:199,h:211,l:174,v:43},{o:197,c:214,h:226,l:191,v:55}
];

const sellRows=[
  ['81,901.30','0.0320','6.1720'],['81,901.00','0.0287','6.1400'],['81,900.80','0.0521','6.1113'],['81,900.10','0.0413','6.0592'],
  ['81,900.00','0.0368','6.0179'],['81,899.90','0.0284','5.9811'],['81,899.80','0.0755','5.9527'],['81,899.70','0.0621','5.8772']
];
const buyRows=[
  ['81,899.40','0.1204','0.1204'],['81,899.30','0.0873','0.2077'],['81,899.20','0.0641','0.2718'],['81,899.10','0.0326','0.3044'],
  ['81,899.00','0.0189','0.3233'],['81,898.90','0.0572','0.3805'],['81,898.80','0.0763','0.4568'],['81,898.70','0.0417','0.4985']
];

function MarketHeader(){
  const metrics=[
    ['Mark Price','81,901.25'],['Index Price','81,903.11'],['24H High','82,099.90'],['24H Low','80,127.60'],['24H Volume','9.11B USDT'],['Funding / Next','+0.0100% · 07:50:07']
  ];
  return <div className={s.marketHeader}>
    <div className={s.symbolBlock}><span className={s.coin}>₿</span><div><b>BTC/USDT</b><small>USDT-M · Perpetual</small></div></div>
    <div className={s.lastPrice}><strong>81,898.40</strong><span>+1.92% (+1,542.30)</span></div>
    {metrics.map(([label,value])=><div className={s.headerMetric} key={label}><small>{label}</small><b>{value}</b></div>)}
  </div>
}

function CandleChart(){
  return <section className={s.chartPanel}>
    <div className={s.chartTabs}><b>차트</b><span>정보</span></div>
    <div className={s.chartToolbar}><span>1m</span><span>30m</span><span>1h</span><span className={s.active}>15m</span><i/><span>⌁</span><span>▦</span><span>지표</span></div>
    <div className={s.chartArea}>
      <div className={s.chartTitle}><b>Bitcoin / TetherUS PERPETUAL · 15 · BITMATE</b><span>시 81,700.0&nbsp; 고 81,975.7&nbsp; 저 81,697.2&nbsp; 종 81,898.4&nbsp; +198.4 (+0.24%)</span></div>
      <div className={s.gridLines}/>
      <div className={s.priceScale}>{['82,200','82,000','81,800','81,600','81,400','81,200','81,000','80,800'].map(x=><span key={x}>{x}</span>)}</div>
      <div className={s.candleField}>
        {candles.map((c,i)=>{
          const up=c.c>=c.o;
          const top=Math.min(c.o,c.c);
          const body=Math.max(8,Math.abs(c.c-c.o));
          const wickTop=c.h;
          const wickBottom=c.l;
          return <span key={i} className={up?s.candleUp:s.candleDown} style={{height:body,transform:`translateY(${208-top}px)`}}>
            <i style={{height:wickTop-wickBottom+14,top:-(wickTop-top+7)}}/>
          </span>
        })}
      </div>
      <div className={s.currentLine}><span>81,898.4</span></div>
      <div className={s.volumeLabel}>거래량 <b>2.03K</b></div>
      <div className={s.volumeBars}>{candles.map((c,i)=><i key={i} className={c.c>=c.o?s.volUp:s.volDown} style={{height:c.v}}/>)}</div>
      <div className={s.chartTimes}><span>21</span><span>01:30</span><span>04:30</span><span>07:30</span><span>10:30</span><span>13:30</span><span>16:30</span><span>19:30</span></div>
    </div>
    <div className={s.chartFooter}><span>1D</span><span>5D</span><span>1M</span><span>3M</span><span>6M</span><span>YTD</span><span>1Y</span><span>전체</span><b>17:09:51 UTC+9</b></div>
  </section>
}

function OrderBook(){
  return <section className={s.orderBook}>
    <div className={s.bookTabs}><b>호가</b><span>최근 체결</span></div>
    <div className={s.bookHead}><span>가격</span><span>수량</span><span>누적</span></div>
    <div className={s.bookRows}>{sellRows.map((r,i)=><div className={s.sellRow} key={i}><b>{r[0]}</b><span>{r[1]}</span><span>{r[2]}</span></div>)}</div>
    <div className={s.bookPrice}><strong>81,898.40 ↑</strong><span>81,901.25</span></div>
    <div className={s.bookRows}>{buyRows.map((r,i)=><div className={s.buyRow} key={i}><b>{r[0]}</b><span>{r[1]}</span><span>{r[2]}</span></div>)}</div>
  </section>
}

function OrderPanel(){
  return <section className={s.orderPanel}>
    <div className={s.sideTabs}><button className={s.long}>Long</button><button>Short</button></div>
    <div className={s.orderTabs}><span>Limit</span><b>Market</b><span>Trigger</span><span>Trailing</span></div>
    <div className={s.modeRow}><b>One-Way</b><span>Hedge</span><span>Cross</span><b>Isolated</b><strong>10x</strong></div>
    <label className={s.available}>Available <b>1,234.56 USDT</b></label>
    <div className={s.inputRow}><span>Price</span><b>Market</b><em>USDT</em></div>
    <div className={s.inputRow}><span>Amount</span><b>0.001</b><em>BTC</em></div>
    <div className={s.ratios}><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
    <div className={s.tpsl}><div><span>Take Profit</span><b>선택</b><em>USDT</em></div><div><span>Stop Loss</span><b>선택</b><em>USDT</em></div></div>
    <div className={s.checks}><span>□ Reduce Only</span><span>□ Post Only</span></div>
    <div className={s.orderSummary}><span>Order Value <b>81.90 USDT</b></span><span>Estimated Fee <b>0.0491 USDT</b></span><span>Required Margin <b>74.2730 USDT</b></span></div>
    <button className={s.cta}>Long BTC</button>
  </section>
}

function AccountStatus(){
  const rows=[['Wallet Balance','12,345.67 USDT'],['Available','11,234.56 USDT'],['Used Margin','1,111.11 USDT'],['Unrealized PNL','+234.56 USDT'],['Realized PNL','+567.89 USDT']];
  return <div className={s.accountStatus}>{rows.map(([label,value],i)=><div key={label}><small>{label}</small><b className={i>2?s.positive:''}>{value}</b></div>)}</div>
}

export function DesktopTradingPreview(){
  return <div className={s.desktopShell}>
    <MarketHeader/>
    <div className={s.workspaceBody}>
      <CandleChart/>
      <OrderBook/>
      <OrderPanel/>
    </div>
    <AccountStatus/>
  </div>
}

function PhoneMockup(){
  return (
    <div className={s.phone}>
      <div className={s.phoneHeader}>
        <b>BITMATE</b>
        <span>● Live</span>
      </div>

      <div className={s.balance}>
        <small>Total Assets</small>
        <strong>₩10,000,000</strong>
        <span>+2.18% today</span>
      </div>

      <div className={s.miniMarket}>
        <div className={s.marketTop}>
          <div><small>BTC/USDT</small><strong>76,526.10</strong></div>
          <span>+2.19%</span>
        </div>
        <div className={s.spark}>
          {[18,22,20,29,26,35,31,42,39,49,46,55].map((h,i)=><i key={i} style={{height:h}}/> )}
        </div>
      </div>

      <div className={s.statusStrip}>
        <span><small>Position</small><b>1 Open</b></span>
        <span><small>Mining</small><b>Active</b></span>
        <span><small>Reward</small><b>3</b></span>
      </div>

      <div className={s.assets}>
        <span><b><i className={s.assetDot}>₿</i>BTC</b><em>0.0421</em><strong>₩4,216,000</strong></span>
        <span><b><i className={s.assetDot}>Ξ</i>ETH</b><em>0.82</em><strong>₩2,941,000</strong></span>
        <span><b><i className={s.assetDot}>S</i>SOL</b><em>18.4</em><strong>₩1,844,000</strong></span>
      </div>

      <div className={s.mobileNav}><b>Home</b><span>Markets</span><span>Trade</span><span>Assets</span></div>
    </div>
  );
}

function MobileVisualGroup(){
  return (
    <div className={s.mobileVisualGroup}>
      <div className={s.phoneMockup}>
        <PhoneMockup/>
        <LandingMediaOverlay slotKey="home_mobile_preview" alt="BITMATE mobile product preview"/>
      </div>
      <QrFloatingCard {...mobilePromo}/>
    </div>
  );
}

export function MobileAccessPreview(){
  return <MobileVisualGroup/>;
}
