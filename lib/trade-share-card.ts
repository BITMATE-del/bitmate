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

const fmt=(v:number,d=2)=>Number(v||0).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});

function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}

function drawText(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,size:number,weight=500,color='#f5f7f8',align:CanvasTextAlign='left'){
  ctx.font=String(weight)+' '+String(size)+'px Arial, sans-serif';ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(value,x,y);
}

async function loadLogo(){
  return await new Promise<HTMLImageElement|null>(resolve=>{
    const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src='/assets/brand/bitmate-logo-horizontal.png';
  });
}

export async function downloadTradeShareCard(input:TradeShareCardInput){
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const positive=input.roi>=0;
  const accent=positive?'#58dfa1':'#ff6c7b';
  const lime='#adff20';

  const g=ctx.createLinearGradient(0,0,1080,1350);g.addColorStop(0,'#080b0d');g.addColorStop(.62,'#111719');g.addColorStop(1,'#17250d');ctx.fillStyle=g;ctx.fillRect(0,0,1080,1350);
  ctx.globalAlpha=.13;ctx.fillStyle=lime;ctx.beginPath();ctx.arc(970,1120,330,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;

  const logo=await loadLogo();
  if(logo){const ratio=logo.width/logo.height;const h=58;ctx.drawImage(logo,64,58,h*ratio,h)}
  else{drawText(ctx,'BITMATE',64,108,48,800,'#ffffff')}

  drawText(ctx,input.market==='FUTURES'?'COIN FUTURES':'CFD',1010,99,24,800,'#8d9ba0','right');
  drawText(ctx,input.symbol,64,246,58,800,'#ffffff');

  const badge=String(input.side).toUpperCase()+(input.market==='FUTURES'&&input.leverage?' '+String(input.leverage)+'x':'');
  ctx.font='800 24px Arial, sans-serif';const bw=ctx.measureText(badge).width+38;rounded(ctx,64,276,bw,48,12);ctx.fillStyle=String(input.side).toUpperCase().includes('LONG')||String(input.side).toUpperCase().includes('BUY')?'#123c2e':'#421d25';ctx.fill();drawText(ctx,badge,83,309,24,800,accent);

  drawText(ctx,'ROI',64,414,30,600,'#89969b');
  drawText(ctx,(input.roi>=0?'+':'')+input.roi.toFixed(2)+'%',64,524,92,800,accent);

  const pnlLabel=input.market==='FUTURES'?'PNL':'PROFIT';
  drawText(ctx,pnlLabel,64,628,26,600,'#89969b');
  drawText(ctx,(input.pnl>=0?'+':'')+fmt(input.pnl,2)+' USDT',64,692,46,800,input.pnl>=0?'#d9ffd1':'#ffd4d9');

  const boxY=770;rounded(ctx,54,boxY,972,390,28);ctx.fillStyle='rgba(255,255,255,.045)';ctx.fill();ctx.strokeStyle='#273238';ctx.lineWidth=2;ctx.stroke();
  const rows=[
    ['Entry Price',fmt(input.entryPrice,4)],
    [input.market==='FUTURES'?'Exit / Mark Price':'Close Price',fmt(input.exitPrice,4)],
    [input.market==='FUTURES'?'Margin':'Investment',input.margin==null?'—':fmt(Number(input.margin),2)+' USDT'],
    ['Status',input.status||'COMPLETED']
  ];
  rows.forEach((r,i)=>{const y=845+i*78;drawText(ctx,r[0],88,y,25,500,'#879398');drawText(ctx,r[1],992,y,30,750,'#f5f7f8','right')});

  ctx.fillStyle=lime;rounded(ctx,64,1210,300,6,3);ctx.fill();
  drawText(ctx,'Trade smarter with BITMATE',64,1270,28,700,'#ffffff');
  drawText(ctx,input.time?new Date(input.time).toLocaleString('ko-KR',{hour12:false}):'',1010,1270,21,500,'#768287','right');

  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png',.96));if(!blob)return;
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='BITMATE-'+input.market+'-'+input.symbol+'-'+Date.now()+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}