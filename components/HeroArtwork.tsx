import LandingMediaOverlay from './LandingMediaOverlay';

export default function HeroArtwork(){
  return (
    <div className="heroArtworkWrap" aria-label="BITMATE Xplore modular hero visual" style={{position:'relative',overflow:'hidden'}}>
      <img
        className="heroArtworkImage"
        src="/xplore/hero-modular.webp?v=11f5a3b"
        alt="BITMATE Xplore modular trading artwork"
      />
      <LandingMediaOverlay slotKey="home_hero_art" alt="BITMATE home hero artwork"/>
    </div>
  );
}
