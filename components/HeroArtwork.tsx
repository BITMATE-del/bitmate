export default function HeroArtwork(){
  return (
    <div className="heroArtworkWrap" aria-label="BITMATE trading hero visual">
      <img
        className="heroArtworkImage"
        src="/assets/bitmate-hero-transparent.png"
        alt="BITMATE hero"
        width={1800}
        height={1200}
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
}
