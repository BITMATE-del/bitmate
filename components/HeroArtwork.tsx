export default function HeroArtwork(){
  const bars=[38,48,55,46,62,70,58,76,83,68,88,96];
  return <div className="heroArtworkWrap" aria-label="BITMATE Xplore trading visual">
    <div className="xploreOrbit xploreOrbitA"/>
    <div className="xploreOrbit xploreOrbitB"/>
    <div className="xploreCoin xploreCoinB">B</div>
    <div className="xploreCoin xploreCoinBTC">₿</div>
    <div className="xploreCoin xploreCoinUSD">₮</div>
    <div className="xploreTradeCard">
      <div className="xploreTop"><span>BITMATE</span><b>LIVE</b></div>
      <div className="xplorePair">BTC/USDT</div>
      <div className="xplorePrice">77,259.40</div>
      <div className="xploreChange">+2.36%</div>
      <div className="xploreChart">{bars.map((h,i)=><i key={i} style={{height:`${h}%`}}/> )}</div>
      <div className="xploreStats">
        <span><small>24H HIGH</small><b>78,120</b></span>
        <span><small>24H LOW</small><b>75,340</b></span>
      </div>
      <div className="xploreActions"><button>Buy</button><button>Sell</button></div>
    </div>
    <div className="xploreChip xploreChipAI">AI<br/><span>Trading</span></div>
    <div className="xploreChip xploreChipETF">ETF<br/><span>Index</span></div>
  </div>;
}
