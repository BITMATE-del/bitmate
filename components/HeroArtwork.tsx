'use client';
import {useEffect,useState} from 'react';

export default function HeroArtwork(){
  const [src,setSrc]=useState('');
  useEffect(()=>{
    fetch('/hero-data.txt').then(r=>r.text()).then(setSrc).catch(()=>setSrc(''));
  },[]);
  return <div className="heroArtworkWrap">{src?<img className="heroArtwork" src={src} alt="BITMATE trading platform visual"/>:<div className="heroArtworkLoading"/>}</div>;
}
