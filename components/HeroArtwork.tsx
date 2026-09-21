export default function HeroArtwork(){
  return (
    <div className="heroArtworkWrap" aria-label="BITMATE trading hero visual">
      <img
        className="heroArtworkImage"
        src="/assets/bitmate-hero-transparent.png"
        alt="BITMATE Hero"
        width={1800}
        height={1400}
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
}
