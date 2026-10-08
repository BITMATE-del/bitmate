export type TradeShareCardInput={
  market:'FUTURES'|'CFD';
  symbol:string;
  side:string;
  leverage?:number|null;
  roi:number;
  entryPrice:number;
  exitPrice:number;
  pnl:number;
  margin?:number|null;
  status?:string|null;
  time?:string|null;
};

const W=1080;
const H=1350;
const fmt=(v:number,d=2)=>Number(v||0).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});

function drawText(
  ctx:CanvasRenderingContext2D,
  value:string,
  x:number,
  y:number,
  size:number,
  weight=700,
  color='#fff',
  align:CanvasTextAlign='left',
  family='Arial, Helvetica, sans-serif'
){
  ctx.save();
  ctx.font=String(weight)+' '+String(size)+'px '+family;
  ctx.fillStyle=color;
  ctx.textAlign=align;
  ctx.textBaseline='middle';
  ctx.fillText(value,x,y);
  ctx.restore();
}

function loadImage(src:string){
  return new Promise<HTMLImageElement>((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=src;
  });
}

function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}

export async function downloadTradeShareCard(input:TradeShareCardInput){
  const canvas=document.createElement('canvas');
  canvas.width=W;
  canvas.height=H;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;

  // Clean master has no dynamic trade values baked into the image.
  // Do not add masking/cover rectangles over symbol, ROI, PNL, prices or date.
  const master=await loadImage('/assets/share/futures-share-master-v4.jpg');
  ctx.drawImage(master,0,0,W,H);

  const isLong=/LONG|BUY/i.test(String(input.side));
  const roi=Number(input.roi)||0;
  const pnl=Number(input.pnl)||0;
  const sideLabel=(isLong?'LONG':'SHORT')+(input.market==='FUTURES'&&input.leverage?' '+String(input.leverage)+'x':'');
  const positive=roi>=0;
  const accent=positive?'#63efaa':'#ff6d87';

  // CFD shares the same fixed artwork footprint; only the fixed market label changes.
  if(input.market==='CFD'){
    ctx.save();
    const g=ctx.createLinearGradient(790,42,1030,100);
    g.addColorStop(0,'rgba(5,14,7,.98)');
    g.addColorStop(1,'rgba(10,26,8,.98)');
    ctx.fillStyle=g;
    rounded(ctx,785,40,250,62,12);
    ctx.fill();
    ctx.restore();
    drawText(ctx,'CFD',1005,72,28,800,'#c8d0d4','right');
  }

  // Empty symbol slot from the clean master.
  drawText(
    ctx,
    String(input.symbol||'').toUpperCase(),
    72,236,
    64,900,
    '#ffffff','left',
    'Arial Black, Arial, Helvetica, sans-serif'
  );

  // Empty side/leverage pill from the clean master.
  drawText(
    ctx,
    sideLabel,
    207,316,
    27,900,
    isLong?'#63efaa':'#ff6d87',
    'center'
  );

  // Empty ROI / PNL value slots from the clean master.
  ctx.save();
  ctx.shadowColor=positive?'rgba(101,239,170,.32)':'rgba(255,109,135,.24)';
  ctx.shadowBlur=14;
  drawText(
    ctx,
    (roi>=0?'+':'')+roi.toFixed(2)+'%',
    72,510,
    88,900,
    accent,'left',
    'Arial Black, Arial, Helvetica, sans-serif'
  );
  ctx.restore();

  drawText(
    ctx,
    (pnl>=0?'+':'')+fmt(pnl,2)+' USDT',
    72,690,
    45,900,
    pnl>=0?'#e7ffd8':'#ffd8de','left',
    'Arial Black, Arial, Helvetica, sans-serif'
  );

  // Right-side value slots are already clean in the master image.
  drawText(ctx,fmt(input.entryPrice,4),982,808,31,800,'#ffffff','right');
  drawText(ctx,fmt(input.exitPrice,4),982,895,31,800,'#ffffff','right');
  drawText(ctx,input.margin==null?'—':fmt(Number(input.margin),2)+' USDT',982,982,31,800,'#ffffff','right');

  const status=String(input.status||'CLOSED').toUpperCase();
  drawText(
    ctx,
    status,
    882,1070,
    25,900,
    status==='CLOSED'?'#b8ff34':'#ffffff',
    'center'
  );

  const time=input.time?new Date(input.time):new Date();
  const ts=time.toLocaleString('ko-KR',{
    year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hour12:false
  }).replace(/\. /g,'. ').replace(/\.$/,'');
  drawText(ctx,ts,995,1260,22,500,'#a6b0b4','right');

  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png',1));
  if(!blob)return;

  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='BITMATE-'+input.market+'-'+input.symbol+'-'+Date.now()+'.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
}
