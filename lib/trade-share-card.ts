import {BITMATE_SHARE_TEMPLATE} from './trade-share-template';

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

function loadTemplate(){
  return new Promise<HTMLImageElement>((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=BITMATE_SHARE_TEMPLATE;
  });
}

function softPatch(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,kind:'black'|'panel'|'green'='black'){
  const pad=18;
  ctx.save();
  const g=ctx.createLinearGradient(x-pad,y,x+w+pad,y+h);
  if(kind==='panel'){
    g.addColorStop(0,'rgba(10,15,16,0)');
    g.addColorStop(.08,'rgba(10,15,16,.96)');
    g.addColorStop(.92,'rgba(10,15,16,.96)');
    g.addColorStop(1,'rgba(10,15,16,0)');
  }else if(kind==='green'){
    g.addColorStop(0,'rgba(7,18,8,0)');
    g.addColorStop(.08,'rgba(7,18,8,.95)');
    g.addColorStop(.92,'rgba(12,31,9,.95)');
    g.addColorStop(1,'rgba(12,31,9,0)');
  }else{
    g.addColorStop(0,'rgba(4,8,8,0)');
    g.addColorStop(.08,'rgba(4,8,8,.97)');
    g.addColorStop(.88,'rgba(5,10,9,.97)');
    g.addColorStop(1,'rgba(5,10,9,0)');
  }
  ctx.filter='blur(1.8px)';
  ctx.fillStyle=g;
  rounded(ctx,x-pad,y-4,w+pad*2,h+8,12);
  ctx.fill();
  ctx.restore();
}

function panelPatch(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number){
  const g=ctx.createLinearGradient(x,y,x+w,y);
  g.addColorStop(0,'rgba(11,17,18,.985)');
  g.addColorStop(1,'rgba(10,16,15,.97)');
  ctx.fillStyle=g;
  ctx.fillRect(x,y,w,h);
}

export async function downloadTradeShareCard(input:TradeShareCardInput){
  const canvas=document.createElement('canvas');
  canvas.width=W;
  canvas.height=H;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;

  const template=await loadTemplate();
  ctx.drawImage(template,0,0,W,H);

  // The selected artwork is fixed. Only the placeholder glyphs are covered.
  // Use feathered, local patches so no rectangular/mosaic blocks appear.
  softPatch(ctx,62,183,420,76,'black');          // symbol placeholder
  softPatch(ctx,63,446,505,104,'black');         // ROI placeholder
  softPatch(ctx,64,650,390,62,'black');          // PNL placeholder
  softPatch(ctx,790,773,205,48,'panel');          // entry
  softPatch(ctx,790,857,205,48,'panel');          // exit
  softPatch(ctx,790,941,205,48,'panel');          // margin
  softPatch(ctx,758,1208,250,42,'green');         // date

  if(input.market==='CFD'){
    softPatch(ctx,770,49,240,45,'green');
    drawText(ctx,'CFD',988,75,24,800,'#c6d0d4','right','Arial, Helvetica, sans-serif');
  }

  const isLong=/LONG|BUY/i.test(String(input.side));
  const sideLabel=(isLong?'LONG':'SHORT')+(input.market==='FUTURES'&&input.leverage?' '+String(input.leverage)+'x':'');
  const sideBg=isLong?'rgba(16,58,38,.96)':'rgba(68,18,27,.96)';
  const sideStroke=isLong?'#38d987':'#cf3f5a';
  const sideText=isLong?'#62efad':'#ff6d87';

  // Rebuild only the dynamic badge in the same footprint as the master artwork.
  softPatch(ctx,70,283,276,52,'black');
  rounded(ctx,72,279,272,54,18);
  ctx.fillStyle=sideBg;ctx.fill();
  ctx.lineWidth=1.4;ctx.strokeStyle=sideStroke;ctx.stroke();
  drawText(ctx,sideLabel,208,306,27,900,sideText,'center','Arial, Helvetica, sans-serif');

  // Symbol
  drawText(ctx,String(input.symbol||'').toUpperCase(),72,229,67,900,'#ffffff','left','Arial Black, Arial, Helvetica, sans-serif');

  // ROI / PNL — same lime treatment as the selected template.
  const roi=(Number(input.roi)||0);
  const pnl=(Number(input.pnl)||0);
  ctx.save();
  ctx.shadowColor='rgba(174,255,39,.42)';
  ctx.shadowBlur=18;
  drawText(ctx,(roi>=0?'+':'')+roi.toFixed(2)+'%',72,500,93,900,'#b7ff35','left','Arial Black, Arial, Helvetica, sans-serif');
  ctx.restore();
  drawText(ctx,(pnl>=0?'+':'')+fmt(pnl,2)+' USDT',72,680,48,900,'#e7ffd6','left','Arial Black, Arial, Helvetica, sans-serif');

  // Detail values: labels/icons/dividers are part of the fixed template.
  drawText(ctx,fmt(input.entryPrice,4),982,799,30,800,'#ffffff','right','Arial, Helvetica, sans-serif');
  drawText(ctx,fmt(input.exitPrice,4),982,883,30,800,'#ffffff','right','Arial, Helvetica, sans-serif');
  drawText(ctx,(input.margin==null?'—':fmt(Number(input.margin),2)+' USDT'),982,967,30,800,'#ffffff','right','Arial, Helvetica, sans-serif');

  // Status pill keeps the original position and silhouette.
  softPatch(ctx,770,1013,218,60,'panel');
  rounded(ctx,784,1016,195,52,24);
  ctx.fillStyle='rgba(36,74,8,.94)';ctx.fill();
  drawText(ctx,String(input.status||'CLOSED').toUpperCase(),881,1042,25,900,'#b8ff34','center','Arial, Helvetica, sans-serif');

  // Timestamp only. Footer artwork/slogan remain untouched.
  const time=input.time?new Date(input.time):new Date();
  const ts=time.toLocaleString('ko-KR',{
    year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hour12:false
  }).replace(/\. /g,'. ').replace(/\.$/,'');
  drawText(ctx,ts,992,1233,21,500,'#849095','right','Arial, Helvetica, sans-serif');

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
