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

function solidPatch(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,kind:'black'|'panel'|'green'='black'){
  const pad=22;
  const edge=ctx.createLinearGradient(x-pad,y,x+w+pad,y+h);
  let left='#040808',right='#07130a';
  if(kind==='panel'){left='#0a0f10';right='#0b1211'}
  if(kind==='green'){left='#071108';right='#0c2109'}
  edge.addColorStop(0,'rgba(0,0,0,0)');
  edge.addColorStop(.12,left);
  edge.addColorStop(.88,right);
  edge.addColorStop(1,'rgba(0,0,0,0)');
  ctx.save();
  ctx.fillStyle=edge;
  rounded(ctx,x-pad,y-5,w+pad*2,h+10,14);
  ctx.fill();
  const core=ctx.createLinearGradient(x,y,x+w,y+h);
  core.addColorStop(0,left);core.addColorStop(1,right);
  ctx.fillStyle=core;
  rounded(ctx,x,y,w,h,8);
  ctx.fill();
  ctx.restore();
}

export async function downloadTradeShareCard(input:TradeShareCardInput){
  const canvas=document.createElement('canvas');
  canvas.width=W;
  canvas.height=H;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;

  const template=await loadTemplate();
  ctx.drawImage(template,0,0,W,H);

  // Fully remove baked placeholder text before drawing live trade data.
  // The center of each patch is opaque; only the outer edge is feathered.
  solidPatch(ctx,55,174,520,96,'black');          // symbol
  solidPatch(ctx,55,432,585,132,'black');         // ROI
  solidPatch(ctx,55,637,500,88,'black');          // PNL
  solidPatch(ctx,770,768,242,60,'panel');         // entry
  solidPatch(ctx,770,852,242,60,'panel');         // exit
  solidPatch(ctx,770,936,242,60,'panel');         // margin
  solidPatch(ctx,735,1198,300,52,'green');        // date

  if(input.market==='CFD'){
    solidPatch(ctx,755,48,270,48,'green');
    drawText(ctx,'CFD',988,75,24,800,'#c6d0d4','right','Arial, Helvetica, sans-serif');
  }

  const isLong=/LONG|BUY/i.test(String(input.side));
  const sideLabel=(isLong?'LONG':'SHORT')+(input.market==='FUTURES'&&input.leverage?' '+String(input.leverage)+'x':'');
  const sideBg=isLong?'rgba(16,58,38,.96)':'rgba(68,18,27,.96)';
  const sideStroke=isLong?'#38d987':'#cf3f5a';
  const sideText=isLong?'#62efad':'#ff6d87';

  // Rebuild only the dynamic badge in the same footprint as the master artwork.
  solidPatch(ctx,60,272,300,70,'black');
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
  solidPatch(ctx,758,1005,240,72,'panel');
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
