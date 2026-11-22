export const PAPERS=Object.freeze({a4:Object.freeze([210000,297000]),letter:Object.freeze([215900,279400])});
export const CROPGAP=650,CROPLENGTH=1750,INK=100;
export const DEFAULT=Object.freeze({paper:'a4',width:'50',height:'25',pitchX:'62',pitchY:'35',rows:'7',cols:'3',count:'27',top:'7',right:'7',bottom:'7',left:'7',bleed:'1',safe:'2',alignment:'center',rotation:'0',crop:true});
export const LIMITS=Object.freeze({millimeterDecimals:3,dimension:[0.1,300],margin:[0,100],bleed:[0,20],safe:[0,50],rows:[1,30],cols:[1,30],labelsPerSheet:400,total:5000,pages:250});
function fail(code,field=null){throw Object.assign(new Error(code),{code,field});}
const mm=(raw,key,min,max)=>{
 const x=String(raw??'').trim();
 if(x.length>16||!/^(?:\d+|\d*\.\d{1,3})$/u.test(x))fail('mm',key);
 const [a,b='']=x.split('.'), value=Number(a||'0')*1000+Number(b.padEnd(3,'0'));
 if(!Number.isSafeInteger(value)||value<min||value>max)fail('range',key);
 return value;
};
const int=(raw,key,min,max)=>{
 const x=String(raw??'').trim();
 if(x.length>12||!/^\d+$/u.test(x))fail('whole',key);
 const value=Number(x);
 if(!Number.isSafeInteger(value)||value<min||value>max)fail('range',key);
 return value;
};
export function layout(c){
 if(!c||!Object.hasOwn(PAPERS,c.paper))fail('paper','paper');
 if(c.alignment!=='center'&&c.alignment!=='corner')fail('alignment','alignment');
 if(c.rotation!=='0'&&c.rotation!=='90')fail('rotation','rotation');
 if(typeof c.crop!=='boolean')fail('crop','crop');
 const [PW,PH]=PAPERS[c.paper];
 const rawW=mm(c.width,'width',100,300000),rawH=mm(c.height,'height',100,300000);
 const [W,H]=c.rotation==='90'?[rawH,rawW]:[rawW,rawH];
 const pitchX=mm(c.pitchX,'pitchX',100,300000),pitchY=mm(c.pitchY,'pitchY',100,300000);
 const rows=int(c.rows,'rows',1,LIMITS.rows[1]),cols=int(c.cols,'cols',1,LIMITS.cols[1]),count=int(c.count,'count',0,LIMITS.total);
 const cap=rows*cols;
 if(cap>LIMITS.labelsPerSheet)fail('gridLimit');
 const top=mm(c.top,'top',0,100000),right=mm(c.right,'right',0,100000),bottom=mm(c.bottom,'bottom',0,100000),left=mm(c.left,'left',0,100000);
 const bleed=mm(c.bleed,'bleed',0,20000),safe=mm(c.safe,'safe',0,50000);
 if(safe*2>=Math.min(W,H))fail('unsafe','safe');
 const pad=bleed+(c.crop?CROPGAP+CROPLENGTH:0)+INK, envW=W+2*pad,envH=H+2*pad;
 if(cols>1&&pitchX<envW)fail('overlapX','pitchX');
 if(rows>1&&pitchY<envH)fail('overlapY','pitchY');
 const usableW=PW-left-right,usableH=PH-top-bottom;
 if(usableW<=0||usableH<=0)fail('margins');
 const gridW=envW+(cols-1)*pitchX,gridH=envH+(rows-1)*pitchY;
 if(gridW>usableW)fail('outsideX');
 if(gridH>usableH)fail('outsideY');
 const pageCount=Math.ceil(count/cap);
 if(pageCount>LIMITS.pages)fail('pageLimit','count');
 const originX=left+pad+(c.alignment==='center'?(usableW-gridW)/2:0),originY=top+pad+(c.alignment==='center'?(usableH-gridH)/2:0);
 const bounds={x:originX-pad,y:originY-pad,w:gridW,h:gridH};
 const placements=Array.from({length:cap},(_,i)=>{const row=Math.floor(i/cols),col=i%cols;return Object.freeze({x:originX+pitchX*col,y:originY+pitchY*row,w:W,h:H,row,col});});
 const pages=Array.from({length:pageCount},(_,i)=>Object.freeze(placements.slice(0,Math.min(cap,count-i*cap))));
 return Object.freeze({paper:c.paper,PW,PH,rawW,rawH,W,H,pitchX,pitchY,rows,cols,count,cap,bleed,safe,crop:c.crop,alignment:c.alignment,rotation:c.rotation,pad,
  margins:Object.freeze({top,right,bottom,left}),bounds:Object.freeze(bounds),placements:Object.freeze(placements),pages:Object.freeze(pages)});
}
export function diagrams(g, sheet){
 return sheet.map(q=>{
  const {x,y,w,h}=q,b=g.bleed,s=g.safe, lx=x-b,rx=x+w+b,ty=y-b,by=y+h+b;
  const marks=g.crop?[
   [lx-CROPGAP-CROPLENGTH,ty,lx-CROPGAP,ty],[rx+CROPGAP,ty,rx+CROPGAP+CROPLENGTH,ty],
   [lx-CROPGAP-CROPLENGTH,by,lx-CROPGAP,by],[rx+CROPGAP,by,rx+CROPGAP+CROPLENGTH,by],
   [lx,ty-CROPGAP-CROPLENGTH,lx,ty-CROPGAP],[rx,ty-CROPGAP-CROPLENGTH,rx,ty-CROPGAP],
   [lx,by+CROPGAP,lx,by+CROPGAP+CROPLENGTH],[rx,by+CROPGAP,rx,by+CROPGAP+CROPLENGTH]
  ]:[];
  return {trim:[x,y,w,h],bleed:b?[lx,ty,w+2*b,h+2*b]:null,safe:s?[x+s,y+s,w-2*s,h-2*s]:null,marks};
 });
}
