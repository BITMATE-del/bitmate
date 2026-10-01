type BrandLogoVariant='horizontal'|'symbol';

type BrandLogoProps={
  variant?:BrandLogoVariant;
  height?:number|string;
  className?:string;
  alt?:string;
};

const sources:Record<BrandLogoVariant,string>={
  horizontal:'/assets/brand/bitmate-logo-horizontal.png',
  symbol:'/assets/brand/bitmate-symbol.png',
};

export default function BrandLogo({
  variant='horizontal',
  height='100%',
  className,
  alt='BITMATE',
}:BrandLogoProps){
  return <img
    src={sources[variant]}
    alt={alt}
    className={className}
    draggable={false}
    style={{
      display:'block',
      width:'auto',
      height,
      maxWidth:'100%',
      objectFit:'contain',
      flexShrink:0,
    }}
  />;
}
