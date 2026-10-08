import type {TradeShareCardInput} from './trade-share-card';

const W=1080,H=1350;
type Result='WIN'|'LOSS'|'DRAW'|'VOID';
const palettes={
 WIN:{accent:'#beff3c',bright:'#edffae',dark:'#294d12',glow:'#7cc414',edge:'#597a23'},
 LOSS:{accent:'#ff718a',bright:'#ffd0d6',dark:'#5e1729',glow:'#d8425a',edge:'#793343'},
 DRAW:{accent:'#d5e3eb',bright:'#ffffff',dark:'#273942',glow:'#94b6c7',edge:'#516671'},
 VOID:{accent:'#e7c57c',bright:'#fff2ca',dark:'#594525',glow:'#bd9150',edge:'#897044'}
} as const;
const money=(n:number,unit:string)=>Number(n||0).toLocaleString('ko-KR',{minimumFractionDigits:unit==='KRW'?0:2,maximumFractionDigits:unit==='KRW'?0:2});
const price=(n:number)=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:8});
function text(ctx:CanvasRenderingContext2D,str:string,x:number,y:number,size:number,color='#fff',weight=700,align:CanvasTextAlign='left'){
 ctx.font=weight+' '+size+'px Arial, sans-serif';ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(str,x,y);
}
function fitted(ctx:CanvasRenderingContext2D,str:string,x:number,y:number,size:number,max:number,color:string,align:CanvasTextAlign='left'){
 let s=size;do{ctx.font='900 '+s+'px Arial, sans-serif';if(ctx.measureText(str).width<=max||s<=30)break;s-=2}while(s>30);
 text(ctx,str,x,y,s,color,900,align);
}
function round(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
 ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function masterSvg(p:typeof palettes[Result]){
 // Fixed premium background, untouched by trade values. The 3D faceted trophy
 // is decorative only; every value area remains blank for live data.
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
 <defs>
 <linearGradient id="bg" x2=".9" y2="1"><stop stop-color="#04090b"/><stop offset=".55" stop-color="#0b1415"/><stop offset="1" stop-color="#0d1813"/></linearGradient>
 <radialGradient id="aura"><stop stop-color="${p.glow}" stop-opacity=".72"/><stop offset=".42" stop-color="${p.glow}" stop-opacity=".18"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient>
 <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.bright}"/><stop offset=".18" stop-color="${p.accent}"/><stop offset=".42" stop-color="#1b2423"/><stop offset=".72" stop-color="${p.edge}"/><stop offset="1" stop-color="${p.bright}"/></linearGradient>
 <linearGradient id="glass" x2="1" y2=".8"><stop stop-color="${p.bright}" stop-opacity=".95"/><stop offset=".23" stop-color="${p.glow}" stop-opacity=".65"/><stop offset=".65" stop-color="#101f1f"/><stop offset="1" stop-color="${p.dark}"/></linearGradient>
 <linearGradient id="panel" x2="1" y2="1"><stop stop-color="#152020"/><stop offset=".5" stop-color="#0b1115"/><stop offset="1" stop-color="#17221f"/></linearGradient>
 <filter id="blur"><feGaussianBlur stdDeviation="31"/></filter>
 <filter id="shadow"><feDropShadow dx="4" dy="24" stdDeviation="18" flood-color="#000" flood-opacity=".8"/></filter>
 </defs>
 <rect width="1080" height="1350" fill="url(#bg)"/>
 <path d="M548 -20 1090 56 1090 708 770 608 568 359Z" fill="${p.glow}" opacity=".045"/>
 <circle cx="826" cy="399" r="405" fill="url(#aura)"/>
 <path d="M570 151 831 -46M656 85 1040 38M671 527 1092 694" fill="none" stroke="${p.accent}" stroke-width="3" opacity=".24"/>
 <path d="M592 157 774 47 894 93 1034 225 997 494 869 620 667 549 592 388Z" stroke="${p.accent}" stroke-opacity=".32" stroke-width="3" fill="none"/>
 <g filter="url(#shadow)" transform="translate(0,-15)">
  <path d="M682 193 733 171 761 227 737 400 709 439 693 368Z" fill="url(#metal)"/>
  <path d="M928 193 877 171 848 227 875 400 903 439 918 368Z" fill="url(#metal)"/>
  <path d="M685 215 640 211 643 311 677 380 716 407" stroke="${p.edge}" stroke-width="18" fill="none"/>
  <path d="M926 215 971 211 969 311 935 380 896 407" stroke="${p.edge}" stroke-width="18" fill="none"/>
  <path d="M728 177 879 177 912 214 887 404 830 477 786 477 723 404 697 214Z" fill="url(#glass)" stroke="${p.bright}" stroke-width="7"/>
  <path d="M728 177 805 242 879 177 912 214 805 365 697 214Z" fill="${p.bright}" opacity=".32"/>
  <path d="M805 242 830 477 887 404 912 214Z" fill="${p.dark}" opacity=".55"/>
  <path d="M805 242 786 477 723 404 697 214Z" fill="${p.glow}" opacity=".34"/>
  <path d="M786 477 830 477 828 532 858 558 748 558 783 532Z" fill="url(#metal)" stroke="${p.bright}" stroke-width="4"/>
  <path d="M750 556 855 556 890 585 713 585Z" fill="url(#glass)" stroke="${p.accent}" stroke-width="4"/>
  <path d="M707 584 897 584 922 629 688 629Z" fill="url(#metal)" stroke="${p.edge}" stroke-width="5"/>
  <path d="M728 177 805 242 879 177M805 242 805 453" stroke="${p.bright}" stroke-width="3" opacity=".68" fill="none"/>
 </g>
 <ellipse cx="800" cy="643" rx="265" ry="46" fill="${p.glow}" opacity=".38" filter="url(#blur)"/>
 <path d="M480 657 601 594 679 618 745 587 853 665 966 610 1080 657V751H480Z" fill="#060b0c" stroke="${p.edge}" stroke-opacity=".28"/>
 <path d="M0 741H1080" stroke="${p.edge}" stroke-opacity=".21" stroke-width="3"/>
 <rect x="58" y="750" width="964" height="116" rx="22" fill="url(#panel)" stroke="${p.edge}" stroke-opacity=".55" stroke-width="2"/>
 <rect x="58" y="900" width="964" height="285" rx="22" fill="url(#panel)" stroke="${p.edge}" stroke-opacity=".42" stroke-width="2"/>
 <path d="M92 973H987M92 1044H987M92 1115H987" stroke="#405151" stroke-width="2" opacity=".65"/>
 <path d="M65 1228H1018" stroke="#344b45" stroke-width="2"/>
 <path d="M65 1228H412" stroke="${p.accent}" stroke-width="5"/>
 <g fill="${p.accent}" opacity=".67"><circle cx="504" cy="155" r="3"/><circle cx="589" cy="275" r="2"/><circle cx="985" cy="520" r="4"/><circle cx="582" cy="590" r="2"/></g>
 </svg>`;
}
async function artwork(ctx:CanvasRenderingContext2D,p:typeof palettes[Result]){
 const blob=new Blob([masterSvg(p)],{type:'image/svg+xml'});
 const url=URL.createObjectURL(blob);
 try{
  const img=await new Promise<HTMLImageElement>((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('CFD 배경 이미지 생성에 실패했습니다.'));i.src=url});
  ctx.drawImage(img,0,0,W,H);
 }finally{URL.revokeObjectURL(url)}
}
async function logo(ctx:CanvasRenderingContext2D){
 await new Promise<void>(resolve=>{const img=new Image();img.onload=()=>{const w=277,h=w*img.naturalHeight/img.naturalWidth;ctx.drawImage(img,68,55,w,h);resolve()};img.onerror=()=>{text(ctx,'BITMATE',68,89,39,'#fff',900);resolve()};img.src='/assets/brand/bitmate-logo-horizontal.png'});
}
export async function buildCfdTradeShareCardPreview(input:TradeShareCardInput):Promise<{url:string;filename:string}>{
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('이미지 생성 기능을 사용할 수 없습니다.');
 const raw=String(input.resultLabel||input.status||'DRAW').toUpperCase();
 const result:Result=raw==='WIN'||raw==='LOSS'||raw==='VOID'?raw:'DRAW';
 const p=palettes[result];const unit=input.currency==='KRW'?'KRW':'USDT';
 const net=Number(input.pnl||0),stake=Number(input.stake??input.margin??0),payout=Number(input.payout||0);
 const display=result==='VOID'?payout:net;
 const moneyTitle=result==='WIN'?'수익금액':result==='LOSS'?'손실금액':result==='VOID'?'환급금액':'정산 손익';
 const resultText=result==='WIN'?'수익 확정':result==='LOSS'?'손실 확정':result==='VOID'?'무효 / 환급':'무승부';
 const direction=/UP|BUY|LONG/i.test(input.side)?'UP':'DOWN';
 await artwork(ctx,p);
 await logo(ctx);
 text(ctx,'CFD  /  TRADE RESULT',1009,84,24,'#c4d1cc',800,'right');
 fitted(ctx,String(input.symbol||'').toUpperCase(),68,210,61,565,'#fff');
 round(ctx,68,263,162,53,17);ctx.fillStyle=direction==='UP'?'#123a2b':'#512532';ctx.fill();
 text(ctx,direction,149,290,27,direction==='UP'?'#73f5ae':'#ff9aaf',900,'center');
 round(ctx,245,263,144,53,17);ctx.fillStyle='#192622';ctx.fill();text(ctx,input.durationLabel||'CFD',317,290,25,'#e7f1ed',800,'center');
 text(ctx,result,68,389,76,p.accent,900);
 text(ctx,resultText,68,453,35,'#e3ede7',800);
 text(ctx,moneyTitle,68,551,29,'#afc1b8');
 ctx.save();ctx.shadowColor=p.glow;ctx.shadowBlur=18;
 fitted(ctx,(display>0?'+':'')+money(display,unit)+' '+unit,68,640,85,944,p.accent);
 ctx.restore();
 text(ctx,'지급금액',100,808,30,'#b6c8c1');
 fitted(ctx,money(payout,unit)+' '+unit,978,808,47,550,'#fff','right');
 const rows=[['거래금액',money(stake,unit)+' '+unit],['거래방향',direction]];
 rows.forEach((row,i)=>{const y=975+i*116;text(ctx,row[0],108,y,27,'#b6c8c1');fitted(ctx,row[1],978,y,32,550,i===1?p.accent:'#fff','right')});
 text(ctx,'BITMATE  |  CFD RESULT',68,1290,28,'#edf5f0',800);
 const date=input.time?new Date(input.time):new Date();
 if(!Number.isNaN(date.getTime()))text(ctx,date.toLocaleString('ko-KR',{hour12:false}),1009,1290,21,'#9aafa5',500,'right');
 const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png',1));
 if(!blob)throw new Error('CFD 공유 이미지 생성에 실패했습니다.');
 return {url:URL.createObjectURL(blob),filename:'BITMATE-CFD-'+input.symbol+'-'+Date.now()+'.png'};
}
