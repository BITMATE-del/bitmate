export default function HeroArtwork(){
  return (
    <div className="heroArtworkWrap" aria-label="BITMATE trading hero visual">
      <img
        className="heroArtworkImage"
        src="/assets/bitmate-hero-visual.webp"
        alt="BITMATE trading app with digital asset market visual"
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
}
