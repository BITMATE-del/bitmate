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

function darkPatch(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,alpha=.98){
  const g=ctx.createLinearGradient(x,y,x+w,y+h);
  g.addColorStop(0,'rgba(5,9,9,'+alpha+')');
  g.addColorStop(.72,'rgba(7,13,12,'+alpha+')');
  g.addColorStop(1,'rgba(12,25,9,'+alpha+')');
  ctx.fillStyle=g;
  ctx.fillRect(x,y,w,h);
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

  // The selected artwork is fixed. Only the data zones below are replaced.
  // No decorative/background elements are regenerated.
  darkPatch(ctx,63,170,485,108,.995);          // symbol placeholder
  darkPatch(ctx,65,424,555,138,.965);          // ROI placeholder
  darkPatch(ctx,66,638,430,84,.965);           // PNL placeholder
  panelPatch(ctx,760,758,225,72);               // entry
  panelPatch(ctx,760,842,225,72);               // exit
  panelPatch(ctx,760,926,225,72);               // margin
  darkPatch(ctx,720,1202,285,58,.94);           // date

  if(input.market==='CFD'){
    darkPatch(ctx,770,44,245,58,.97);
    drawText(ctx,'CFD',988,75,24,800,'#c6d0d4','right','Arial, Helvetica, sans-serif');
  }

  const isLong=/LONG|BUY/i.test(String(input.side));
  const sideLabel=(isLong?'LONG':'SHORT')+(input.market==='FUTURES'&&input.leverage?' '+String(input.leverage)+'x':'');
  const sideBg=isLong?'rgba(16,58,38,.96)':'rgba(68,18,27,.96)';
  const sideStroke=isLong?'#38d987':'#cf3f5a';
  const sideText=isLong?'#62efad':'#ff6d87';

  // Rebuild only the dynamic badge in the same footprint as the master artwork.
  darkPatch(ctx,65,278,300,62,.99);
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
  panelPatch(ctx,770,1011,220,65);
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
