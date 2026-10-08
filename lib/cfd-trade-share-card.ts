import type {TradeShareCardInput} from './trade-share-card';

const W=1080,H=1350;
const format=(v:number,currency:string)=>Number(v||0).toLocaleString('ko-KR',{minimumFractionDigits:currency==='KRW'?0:2,maximumFractionDigits:currency==='KRW'?0:2});
function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.closePath();
}
function label(ctx:CanvasRenderingContext2D,t:string,x:number,y:number,size:number,color:string,weight=700,align:CanvasTextAlign='left'){
 ctx.font=weight+' '+size+'px Arial, sans-serif';ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(t,x,y);
}
function fit(ctx:CanvasRenderingContext2D,t:string,x:number,y:number,preferred:number,maxWidth:number,color:string,align:CanvasTextAlign='left'){
 let size=preferred;
 do{ctx.font='900 '+size+'px Arial, sans-serif';if(ctx.measureText(t).width<=maxWidth||size<=34)break;size-=2}while(size>34);
 label(ctx,t,x,y,size,color,900,align);
}
async function logo(ctx:CanvasRenderingContext2D){
 await new Promise<void>(resolve=>{
  const i=new Image();i.onload=()=>{const w=260,h=w*i.naturalHeight/i.naturalWidth;ctx.drawImage(i,68,66,w,h);resolve()};i.onerror=()=>resolve();
  i.src='/assets/brand/bitmate-logo-horizontal.png';
 });
}
export async function buildCfdTradeShareCardPreview(input:TradeShareCardInput):Promise<{url:string;filename:string}>{
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('CFD 이미지 생성 기능을 사용할 수 없습니다.');
 const result=String(input.resultLabel||input.status||'').toUpperCase();
 const normalized=result==='WIN'?'WIN':result==='LOSS'?'LOSS':result==='VOID'?'VOID':result==='DRAW'?'DRAW':'DRAW';
 const color=normalized==='WIN'?'#b8ff33':normalized==='LOSS'?'#ff6e89':'#f6cc68';
 const title=normalized==='WIN'?'수익':normalized==='LOSS'?'손실':normalized==='VOID'?'무효 / 환급':'무승부';
 const moneyTitle=normalized==='WIN'?'수익금액':normalized==='LOSS'?'손실금액':normalized==='VOID'?'환급금액':'정산 손익';
 const unit=input.currency==='KRW'?'KRW':'USDT';
 const stake=Number(input.stake??input.margin??0),payout=Number(input.payout??0);
 const net=Number(input.pnl||0);
 const amount=normalized==='VOID'?payout:normalized==='DRAW'?net:net;
 const amountText=(amount>0?'+':'')+format(amount,unit)+' '+unit;
 const direction=/UP|BUY|LONG/i.test(input.side)?'UP':'DOWN';
 const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#060b0c');bg.addColorStop(.5,'#091410');bg.addColorStop(1,'#111e0d');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 const glow=ctx.createRadialGradient(840,345,20,840,345,480);glow.addColorStop(0,normalized==='WIN'?'#53750f':normalized==='LOSS'?'#5f2030':'#725823');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=.62;ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
 // A distinct CFD result seal, not a futures-position graphic.
 ctx.save();ctx.translate(820,343);ctx.rotate(-.16);ctx.lineWidth=5;ctx.strokeStyle=color;ctx.globalAlpha=.72;ctx.beginPath();ctx.arc(0,0,195,0,Math.PI*2);ctx.stroke();ctx.lineWidth=2;ctx.globalAlpha=.35;ctx.beginPath();ctx.arc(0,0,168,0,Math.PI*2);ctx.stroke();ctx.restore();
 label(ctx,normalized==='WIN'?'✓':normalized==='LOSS'?'×':'–',820,345,215,color,900,'center');
 await logo(ctx);
 label(ctx,'CFD RESULT',1008,93,24,'#b2c1bc',800,'right');
 label(ctx,String(input.symbol||'').toUpperCase(),70,214,62,'#fff',900);
 rounded(ctx,70,267,162,53,18);ctx.fillStyle=direction==='UP'?'#123c2a':'#48212c';ctx.fill();
 label(ctx,direction,151,294,27,direction==='UP'?'#7dffbe':'#ff91a2',900,'center');
 rounded(ctx,247,267,142,53,18);ctx.fillStyle='#1a2825';ctx.fill();label(ctx,input.durationLabel||'CFD',318,294,25,'#e6f3ed',800,'center');
 label(ctx,normalized,70,402,72,color,900);label(ctx,title,70,469,35,'#e6eee8',700);
 label(ctx,moneyTitle,70,564,29,'#a6b8b2',700);
 fit(ctx,amountText,70,648,83,940,color);
 rounded(ctx,66,750,948,123,22);ctx.fillStyle='#16241f';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#3a5744';ctx.stroke();
 label(ctx,'지급금액',102,812,31,'#b5c8c0',700);
 fit(ctx,format(payout,unit)+' '+unit,977,812,45,530,'#fff','right');
 rounded(ctx,66,909,948,278,22);ctx.fillStyle='#101b1a';ctx.fill();ctx.strokeStyle='#344841';ctx.stroke();
 [978,1047,1116].forEach(y=>{ctx.strokeStyle='#35483f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(97,y);ctx.lineTo(983,y);ctx.stroke()});
 const price=(v:number)=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:8});
 const rows=[['거래금액',format(stake,unit)+' '+unit],['시작가',price(input.entryPrice)],['종료가',price(input.exitPrice)],['거래방향',direction]];
 rows.forEach((r,i)=>{const y=948+i*69;label(ctx,r[0],108,y,26,'#a9b9b3');fit(ctx,r[1],976,y,30,530,'#fff','right')});
 ctx.strokeStyle='#a8f532';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(70,1233);ctx.lineTo(420,1233);ctx.stroke();
 label(ctx,'BITMATE  |  CFD',70,1294,28,'#f3f9f4',800);
 const date=input.time?new Date(input.time):new Date();
 if(!Number.isNaN(date.getTime()))label(ctx,date.toLocaleString('ko-KR',{hour12:false}),1008,1294,22,'#94a8a0',500,'right');
 const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png',1));
 if(!blob)throw new Error('CFD 공유 이미지 생성에 실패했습니다.');
 return {url:URL.createObjectURL(blob),filename:'BITMATE-CFD-'+input.symbol+'-'+Date.now()+'.png'};
}
