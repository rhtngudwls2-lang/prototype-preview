// Self-contained QR v1-L byte-mode encoder for tiny, inert synthetic examples only.
function matrix(value){
  const data=new TextEncoder().encode(value);if(data.length>17)throw new Error("Synthetic fixture payload >17 bytes");
  let bits=[];
  const push=(v,n)=>{for(let i=n-1;i>=0;i--)bits.push(v>>i&1);};
  push(4,4);push(data.length,8);for(const b of data)push(b,8);
  push(0,Math.min(4,152-bits.length));while(bits.length%8)bits.push(0);
  const bytes=[];for(let i=0;i<bits.length;i+=8)bytes.push(bits.slice(i,i+8).reduce((a,b)=>2*a+b,0));
  while(bytes.length<19)bytes.push((bytes.length-Math.ceil(bits.length/8))%2?0x11:0xec);
  const gf=(a,b)=>{let z=0;while(b){if(b&1)z^=a;b>>=1;a<<=1;if(a&256)a^=0x11d;}return z;};
  // Construct the degree-seven Reed-Solomon divisor for QR v1-L.
  let poly=[1],root=1;
  for(let i=0;i<7;i++){const p=new Array(poly.length+1).fill(0);poly.forEach((v,j)=>{p[j]^=v;p[j+1]^=gf(v,root);});poly=p;root=gf(root,2);}
  let ecc=Array(7).fill(0);
  for(const b of bytes){const f=b^ecc.shift();ecc.push(0);ecc=ecc.map((e,i)=>e^gf(poly[i+1],f));}
  bits=[];for(const b of [...bytes,...ecc])push(b,8);
  const m=Array.from({length:21},()=>Array(21).fill(null));
  const set=(x,y,v)=>{if(x>=0&&x<21&&y>=0&&y<21)m[y][x]=+Boolean(v);};
  for(const [cx,cy] of [[3,3],[17,3],[3,17]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
    const d=Math.max(Math.abs(dx),Math.abs(dy));set(cx+dx,cy+dy,d!==2&&d!==4);
  }
  for(let i=8;i<=12;i++){set(i,6,i%2===0);set(6,i,i%2===0);}
  const fmt=0x77c4, b=i=>fmt>>i&1;
  for(let i=0;i<=5;i++)set(8,i,b(i));
  set(8,7,b(6));set(8,8,b(7));set(7,8,b(8));
  for(let i=9;i<15;i++)set(14-i,8,b(i));
  for(let i=0;i<8;i++)set(20-i,8,b(i));
  for(let i=8;i<15;i++)set(8,6+i,b(i));
  set(8,13,1);
  let index=0;
  for(let col=20;col>=1;col-=2){
    if(col===6)col=5;
    for(let i=0;i<21;i++){
      const y=((col+1)&2)===0?20-i:i;
      for(let j=0;j<2;j++){
        const x=col-j;if(m[y][x]===null)set(x,y,(bits[index++]??0)^((x+y)%2===0));
      }
    }
  }
  if(index!==208)throw new Error("Fixture encoding invariant");
  return m;
}
function pdf(pages){
  const strings=["<< /Type /Catalog /Pages 2 0 R >>", ""];
  const kids=[];
  pages.forEach(({slots,width=400,height=400,rotation=0,crop,marks=[]})=>{
    const pageID=strings.length+1; kids.push(pageID+" 0 R");
    const streamID=pageID+1;
    strings.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+width+" "+height+"] /Rotate "+rotation+(crop?" /CropBox ["+crop.join(" ")+"]":"")+" /Resources << >> /Contents "+streamID+" 0 R >>");
    const parts=["0 g"];
    slots.forEach(({value,x,y,size=84,hurt=false})=>{
      const step=size/21;
      matrix(value).forEach((row,r)=>row.forEach((v,c)=>{
        if(v&&!(hurt&&(r<11||c<8)))parts.push([x+c*step,y+(20-r)*step,step,step].map(s=>s.toFixed(3)).join(" ")+" re");
      }));
      parts.push("f");
    });
    for(const [x,y,w,h] of marks)parts.push([x,y,w,h].join(" ")+" re f");
    const body=parts.join("\n")+"\n";
    strings.push("<< /Length "+body.length+" >>\nstream\n"+body+"endstream");
  });
  strings[1]="<< /Type /Pages /Kids ["+kids.join(" ")+"] /Count "+pages.length+" >>";
  let output="%PDF-1.7\n% synthetic SlotProof fixture\n";const xref=[0];
  strings.forEach((s,i)=>{xref.push(output.length);output+=(i+1)+" 0 obj\n"+s+"\nendobj\n";});
  const start=output.length;
  output+="xref\n0 "+xref.length+"\n0000000000 65535 f \n";
  for(const offset of xref.slice(1))output+=String(offset).padStart(10,"0")+" 00000 n \n";
  output+="trailer\n<< /Size "+xref.length+" /Root 1 0 R >>\nstartxref\n"+start+"\n%%EOF\n";
  return new TextEncoder().encode(output);
}
const pos=(v,i,{hurt=false}={})=>({value:v,x:58+200*(i%2),y:258-200*Math.floor(i/2),hurt});
const base=[["0001","0003","0005","0007"],["0002","0004","0006","0008"]];
const header="page,row,column,value,kind";
const line=(p,i,v)=>[p,Math.floor(i/2)+1,i%2+1,v,v===""?"blank":"code"].join(",");
const csv=(list,sep=false)=>[header,...list.flatMap((vs,j)=>vs===null?[(j+1)+",,,,separator"]:vs.map((v,i)=>line(j+1,i,v)))].join("\r\n")+"\r\n";
export const sampleLayout={rows:2,columns:2,top:0,right:0,bottom:0,left:0};
export function fixture(kind="match"){
  let approved=base.map(a=>a.slice()), real=base.map(a=>a.slice()), alternate={}, changedCSV;
  if(kind==="swap") [real[1][1],real[1][2]]=[real[1][2],real[1][1]];
  if(kind==="missing") real[1][1]="";
  if(kind==="literal") real[1][1]="4";
  if(kind==="damaged") alternate.hurt=true;
  if(kind==="size") alternate.width=420;
  if(kind==="page-missing") real.pop();
  if(kind==="crop-rotation"){
    // 180 degrees: the physical positions become doubly reversed after CropBox.
    real[0].reverse();real[1].reverse();alternate.turnAll=true;
  }
  if(kind==="decorated-blank"){approved[1][1]="";real[1][1]="";alternate.decorated=true;}
  if(kind==="extra-blank"){approved[1][1]="";}
  if(kind==="separator-extra"){approved.splice(1,0,null);real.splice(1,0,["0009","","",""]);}
  if(kind==="separator-mark"){approved.splice(1,0,null);real.splice(1,0,null);}
  if(kind==="separator-two"){approved.splice(1,0,null);real.splice(1,0,["0009","","","0011"]);}
  if(kind==="approved"){
    approved[0][1]="0001";real[0][1]="0001";
    approved[1][1]="";real[1][1]="";approved.splice(1,0,null);real.splice(1,0,null);
    const rev=csv(approved).trimEnd().split("\r\n");changedCSV=rev.shift()+"\r\n"+rev.reverse().join("\r\n")+"\r\n";
  }
  if(kind==="utf8-text"){approved[1][1]="한글 0A";real[1][1]="한글 0A";}
  if(kind==="crop-rotation-90"){for(let i=0;i<real.length;i++){const v=real[i];real[i]=[v[1],v[3],v[0],v[2]];}alternate.turn90=true;}
  if(kind==="url-text"){approved[1][1]="https://x.test";real[1][1]="https://x.test";}
  if(kind==="formula-text"){approved[1][1]="=1+1";real[1][1]="=1+1";}
  if(kind==="unknown-page")real.push(["0011","0012","0013","0014"]);
  if(kind==="outside"||kind==="outside-crossing") alternate.outside=true;
  if(kind==="multi"||kind==="multi-blank") alternate.multi=true;
  if(kind==="multi-blank")approved[1][1]="";
  const pages=real.map((v,j)=>{
    if(v===null)return {slots:[],marks:kind==="separator-mark"?[[170,170,11,8]]:[]};
    const slots=v.flatMap((s,i)=>s?[pos(s,i,{hurt:alternate.hurt&&j===1&&i===1})]:[]);
    if(kind==="outside")for(let i=0;i<slots.length;i+=2)slots[i].x+=34;
    if(alternate.outside&&j===1)slots.push({value:"0011",x:12,y:176,size:47});
    if(alternate.multi&&j===1){slots[1]={...slots[1],x:216,y:270,size:63};slots.push({value:"0011",x:314,y:270,size:63});}
    return {slots,width:j===1?alternate.width:undefined,
      rotation:alternate.turn90?90:alternate.turnAll?180:0,crop:alternate.turnAll||alternate.turn90?[16,12,384,388]:undefined,
      marks:alternate.decorated&&j===1?[[305,330,8,7]]:kind==="slot-stamp"&&j===1?[[370,335,8,11]]:[]};
  });
  return {pdf:pdf(pages),csv:changedCSV??csv(approved)};
}

