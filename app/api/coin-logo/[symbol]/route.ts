import {NextResponse} from 'next/server';

// Only curated CoinGecko identities: ticker-only API search can resolve the WRONG token.
const ids:Record<string,string>={
  CAT:'simons-cat',OG:'og-fan-token', '1000CHEEMS':'1000chems',
  PEPE:'pepe',SHIB:'shiba-inu',WIF:'dogwifcoin',BONK:'bonk',FLOKI:'floki',
  ENA:'ethena',WLD:'worldcoin-wld',ARB:'arbitrum',OP:'optimism',
  TIA:'celestia',INJ:'injective-protocol',SEI:'sei-network',
  FET:'fetch-ai',RENDER:'render-token',JUP:'jupiter-exchange-solana',
  PYTH:'pyth-network',PENGU:'pudgy-penguins',ONDO:'ondo-finance',
  VIRTUAL:'virtual-protocol'
};

export async function GET(_request:Request,{params}:{params:Promise<{symbol:string}>}){
  const {symbol}=await params;
  const ticker=symbol.toUpperCase().replace(/^1000(?=[A-Z])/,symbol.toUpperCase()==='1000CHEEMS'?'1000':'');
  const id=ids[ticker];
  if(!id)return new NextResponse(null,{status:404});
  try{
    const url=`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`;
    const response=await fetch(url,{next:{revalidate:86400},headers:{Accept:'application/json'}});
    if(!response.ok)return new NextResponse(null,{status:404});
    const data=await response.json() as {symbol?:string;image?:{small?:string;thumb?:string}};
    // Check ticker too, so a changed slug cannot silently display the wrong icon.
    if(data.symbol?.toUpperCase()!==ticker)return new NextResponse(null,{status:404});
    const image=data.image?.small||data.image?.thumb;
    if(!image||!image.startsWith('https://'))return new NextResponse(null,{status:404});
    const redirect=NextResponse.redirect(image,302);
    redirect.headers.set('Cache-Control','public, max-age=3600, stale-while-revalidate=86400');
    return redirect;
  }catch{return new NextResponse(null,{status:404})}
}
