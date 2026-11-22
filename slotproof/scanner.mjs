import * as pdfjs from "./vendor/pdfjs/build/pdf.min.mjs";
import {LIMITS,issue,key,pageShape,sameShape,slotRects} from "./core.mjs";
pdfjs.GlobalWorkerOptions.workerSrc=new URL("./vendor/pdfjs/build/pdf.worker.min.mjs",import.meta.url).href;
const tasks=new WeakMap();
export async function closePDF(pdf){const task=tasks.get(pdf);if(task){tasks.delete(pdf);await task.destroy();}}
const getCtx=(c)=>c.getContext("2d",{alpha:false,willReadFrequently:true});
const defer=()=>new Promise(resolve=>setTimeout(resolve,0));
function assertActive(signal){if(signal?.aborted)throw issue("cancelled");}
export async function openPDF(bytes){
  if(!bytes?.length||bytes.length>LIMITS.pdf)throw issue("pdfSize");
  const prefix=new TextDecoder().decode(bytes.subarray(0,1024));
  if(!prefix.includes("%PDF-"))throw issue("pdfInvalid");
  let protectedPDF=false;
  const task=pdfjs.getDocument({data:bytes.slice(), stopAtErrors:true, isEvalSupported:false, useWasm:false, useWorkerFetch:false, disableFontFace:true, useSystemFonts:true, enableXfa:false, isImageDecoderSupported:false, isOffscreenCanvasSupported:false});
  task.onPassword=update=>{protectedPDF=true;update(new Error("Password-protected PDF"));};
  try{
    const pdf=await task.promise;
    if(!pdf.numPages||pdf.numPages>LIMITS.pages){await task.destroy();throw issue("pageLimit");}
    tasks.set(pdf,task);return pdf;
  }catch(e){await task.destroy().catch(()=>{});throw (e.code==="pageLimit"?e:issue(protectedPDF?"pdfPassword":"pdfInvalid"));}
}
export async function renderPDFPage(page,maxSide=2100){
  const shape=pageShape(page);
  if(!shape.valid)throw issue("pageGeometry");
  const scale=Math.min(3,maxSide/Math.max(shape.width,shape.height),Math.sqrt(LIMITS.pixels/(shape.width*shape.height)));
  const vp=page.getViewport({scale});
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.ceil(vp.width));canvas.height=Math.max(1,Math.ceil(vp.height));
  const context=getCtx(canvas);
  if(!context)throw issue("renderFailed");
  await page.render({canvas,canvasContext:context,viewport:vp,background:"white",intent:"print",annotationMode:pdfjs.AnnotationMode.ENABLE}).promise;
  return {canvas,context,scale};
}
const lim=(n,a,b)=>Math.min(b,Math.max(n,a));
function padding(rect,amount,w,h){
  const x=lim(rect.x-amount,0,w),y=lim(rect.y-amount,0,h);
  return {x,y,w:Math.min(w,rect.x+rect.w+amount)-x,h:Math.min(h,rect.y+rect.h+amount)-y};
}
function ink(data,x=0,y=0,w=data.width,h=data.height){
  if(w<=0||h<=0)return false;
  for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++){
    const k=(j*data.width+i)*4;
    if(data.data[k]<254||data.data[k+1]<254||data.data[k+2]<254)return true;
  }
  return false;
}
function hitBounds(found){
  const p=[found.location.topLeftCorner,found.location.topRightCorner,found.location.bottomLeftCorner,found.location.bottomRightCorner];
  return {x0:Math.min(...p.map(v=>v.x)),x1:Math.max(...p.map(v=>v.x)),y0:Math.min(...p.map(v=>v.y)),y1:Math.max(...p.map(v=>v.y))};
}
function exactText(hit){
  try{
    if(!hit.data||hit.data.length>LIMITS.payload||/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(hit.data))return null;
    const chunks=hit.chunks;
    if(!chunks?.length||chunks.some(c=>!["numeric","alphanumeric","byte","eci"].includes(c.type)))return null;
    if(chunks.some(c=>c.type==="eci"&&c.assignmentNumber!==26&&c.assignmentNumber!==3))return null;
    const encoding=chunks.some(c=>c.type==="eci"&&c.assignmentNumber===3)?"latin1":"utf-8";
    // Round-trip byte segments, reject encodings the library does not emit faithfully.
    if(encoding==="latin1")return null;
    for(const c of chunks)if(c.type==="byte"&&new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(Uint8Array.from(c.bytes))!==c.text)return null;
    if(chunks.filter(c=>c.type!=="eci").map(c=>c.text).join("")!==hit.data)return null;
    return hit.data;
  }catch{return null;}
}
function extract(context,outer,nominal,{limit=3,wasInk=true}={}){
  if(outer.w<22||outer.h<22)return {hits:[],clear:false,saturated:false,small:true};
  const img=context.getImageData(outer.x,outer.y,outer.w,outer.h);
  const clear=!ink(img,nominal.x-outer.x,nominal.y-outer.y,nominal.w,nominal.h);
  if(clear&&!wasInk&&!ink(img))return {hits:[],clear,saturated:false};
  const hits=[];
  const decode=window.jsQR;
  let saturated=false;
  for(let i=0;i<=limit;i++){
    const decoded=decode(img.data,img.width,img.height,{inversionAttempts:"attemptBoth"});
    if(!decoded)break;
    if(i===limit){saturated=true;break;}
    const b=hitBounds(decoded);
    const cx=(b.x0+b.x1)/2+outer.x,cy=(b.y0+b.y1)/2+outer.y;
    const bw=b.x1-b.x0,bh=b.y1-b.y0;
    if(![cx,cy,bw,bh].every(Number.isFinite)||bw<9||bh<9){saturated=true;break;}
    const dim=17+4*decoded.version;
    const near=(Math.min(bw,bh)/dim)<2.5;
    hits.push({cx,cy,text:exactText(decoded),x0:b.x0+outer.x,x1:b.x1+outer.x,y0:b.y0+outer.y,y1:b.y1+outer.y,near});
    const margin=Math.max(1,Math.ceil(Math.min(bw,bh)/dim));
    const left=lim(Math.floor(b.x0)-margin,0,img.width),right=lim(Math.ceil(b.x1)+margin,0,img.width);
    const top=lim(Math.floor(b.y0)-margin,0,img.height),bottom=lim(Math.ceil(b.y1)+margin,0,img.height);
    for(let y=top;y<bottom;y++)img.data.fill(255,(y*img.width+left)*4,(y*img.width+right)*4);
  }
  return {hits,clear,saturated};
}
function ident(a,b){return Math.hypot(a.cx-b.cx,a.cy-b.cy)<Math.max(4,Math.min(a.x1-a.x0,a.y1-a.y0,b.x1-b.x0,b.y1-b.y0)*0.20);}
const inRect=(p,r)=>p.cx>=r.x&&p.cx<r.x+r.w&&p.cy>=r.y&&p.cy<r.y+r.h;
const crosses=(p,r)=>p.x0<r.x+2||p.y0<r.y+2||p.x1>r.x+r.w-2||p.y1>r.y+r.h-2;
function addUnique(hits,newHits){for(const h of newHits){const existing=hits.find(v=>ident(h,v));if(!existing)hits.push(h);else if(h.text!==existing.text){existing.conflict=true;}}}
function cover(g,h){
  const x0=Math.max(g.x,h.x0-2),y0=Math.max(g.y,h.y0-2);
  const x1=Math.min(g.x+g.w,h.x1+2),y1=Math.min(g.y+g.h,h.y1+2);
  return {x0:Math.max(0,Math.floor(x0-g.x)),y0:Math.max(0,Math.floor(y0-g.y)),
    x1:Math.min(g.w,Math.ceil(x1-g.x)),y1:Math.min(g.h,Math.ceil(y1-g.y))};
}
function residualInk(context,rect,hits){
  if(!rect.w||!rect.h)return false;
  const img=context.getImageData(rect.x,rect.y,rect.w,rect.h);
  for(const h of hits){
    const b=cover(rect,h);
    if(b.x1<=b.x0||b.y1<=b.y0)continue;
    for(let y=b.y0;y<b.y1;y++)img.data.fill(255,(y*img.width+b.x0)*4,(y*img.width+b.x1)*4);
  }
  return ink(img);
}
function cuts(rect,nx,ny){
  const x=rect.x,y=rect.y,w=rect.w,h=rect.h;
  const pieces=[];
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const u=Math.floor(i*w/nx),v=Math.floor(j*h/ny);
    pieces.push({x:x+u,y:y+v,w:Math.floor((i+1)*w/nx)-u,h:Math.floor((j+1)*h/ny)-v});
  }
  return pieces;
}
function tiled(context,rect,w,h,limit=3,force=false){
  const main=extract(context,rect,rect,{limit,wasInk:false});
  if(main.clear||(!force&&main.hits.length&&!residualInk(context,rect,main.hits)))return main;
  const passes=force?[[2,2],[2,1],[1,2],[3,3]]:[[2,1],[1,2],[2,2]];
  for(const [nx,ny] of passes){
    if(rect.w/nx<22||rect.h/ny<22)continue;
    for(const r of cuts(rect,nx,ny)){
      const a=Math.max(10,Math.floor(Math.min(r.w,r.h)*0.18));
      const d=extract(context,padding(r,a,w,h),r,{limit,wasInk:false});
      if(d.saturated)main.saturated=true;
      addUnique(main.hits,d.hits.filter(v=>inRect(v,rect)));
    }
    if(main.hits.length&&!residualInk(context,rect,main.hits))break;
  }
  return main;
}
async function exploreRaster(render,layout,forceWhole,signal){
  const {canvas:{width:w,height:h},context}=render;
  const all={x:0,y:0,w,h};
  if(forceWhole){
    const result=tiled(context,all,w,h,10,true);
    return {cells:new Map(),other:result.hits.filter(x=>x.text!==null&&!x.near).map(x=>x.text),
      uncertain:result.saturated||result.hits.some(x=>x.text===null||x.near||x.conflict||crosses(x,all))||
        (!result.clear&&residualInk(context,all,result.hits)),clear:result.clear};
  }
  const rects=slotRects(w,h,layout);
  const cells=new Map(),hits=[], analysis=[];
  let checks=0;
  for(const rect of rects){
    if(checks++%12===0){assertActive(signal);await defer();}
    const amount=Math.max(10,Math.round(Math.min(rect.w,rect.h)*0.22));
    const d=tiled(context,rect,w,h);
    if(!d.clear&&(!d.hits.length||residualInk(context,rect,d.hits))){
      const r=extract(context,padding(rect,amount,w,h),rect,{wasInk:false});
      addUnique(d.hits,r.hits);d.saturated||=r.saturated;
    }
    analysis.push({rect,d});
    addUnique(hits,d.hits);
  }
  const left=rects[0].x,top=rects[0].y,last=rects.at(-1);
  const right=last.x+last.w,bottom=last.y+last.h;
  const margins=[
    {x:0,y:0,w,h:top},{x:0,y:bottom,w,h:h-bottom},
    {x:0,y:top,w:left,h:bottom-top},{x:right,y:top,w:w-right,h:bottom-top}
  ].filter(r=>r.w>0&&r.h>0);
  let uncertain=false;
  for(const rect of margins){
    if(!ink(context.getImageData(rect.x,rect.y,rect.w,rect.h)))continue;
    const cropped=padding(rect,Math.max(18,Math.round(Math.min(w,h)*0.065)),w,h);
    const d=tiled(context,rect,w,h,6,true);
    const p=extract(context,cropped,rect,{limit:6});
    addUnique(d.hits,p.hits);d.saturated||=p.saturated;
    if(d.saturated||d.small||d.hits.some(x=>x.text===null||x.near||x.conflict)||residualInk(context,rect,d.hits))uncertain=true;
    addUnique(hits,d.hits);
  }
  for(const {rect,d} of analysis){
    const local=hits.filter(hit=>inRect(hit,rect));
    const foreign=hits.some(q=>!inRect(q,rect)&&q.x1>=rect.x&&q.x0<=rect.x+rect.w&&q.y1>=rect.y&&q.y0<=rect.y+rect.h);
    cells.set(key(0,rect.row,rect.column),{
      // A spanning symbol is evidence for review, never a payload assigned to either slot.
      payloads:local.filter(q=>q.text!==null&&!q.near&&!q.conflict&&!crosses(q,rect)).map(q=>q.text),clear:d.clear,
      ambiguous:d.saturated||d.small||foreign||local.some(q=>q.near||q.conflict||crosses(q,rect)),
      unsupported:local.some(q=>q.text===null),
      residue:!!local.length&&residualInk(context,rect,local)
    });
  }
  const outside=hits.filter(hit=>!rects.some(r=>inRect(hit,r)));
  const intersectsGrid=q=>q.x1>left&&q.x0<right&&q.y1>top&&q.y0<bottom;
  return {cells,other:outside.filter(x=>x.text!==null&&!x.near&&!x.conflict&&!intersectsGrid(x)).map(x=>x.text),
    uncertain:uncertain||outside.some(x=>x.text===null||x.near||x.conflict||intersectsGrid(x)),reason:"outsideReview"};
}
export async function scanPDF(pdf,layout,expected,{signal,progress}={}){
  const found=new Map(),shapes=[];
  for(let i=1;i<=pdf.numPages;i++){
    assertActive(signal);
    try{const p=await pdf.getPage(i);shapes[i]=pageShape(p);}catch{shapes[i]={valid:false};}
  }
  const anchor=shapes.find((s,i)=>s?.valid&&expected.get(i)&&!expected.get(i).separator);
  const wholeSlotCount=pdf.numPages*layout.rows*layout.columns;
  if(wholeSlotCount>LIMITS.slots)throw issue("scanTooLarge");
  for(let i=1;i<=pdf.numPages;i++){
    assertActive(signal);
    progress?.(i,pdf.numPages);
    await defer();
    const e=expected.get(i),m=shapes[i];
    const whole=!e||e.separator;
    if(!m?.valid){found.set(i,{block:"pageGeometry"});continue;}
    if(!whole&&(!anchor||!sameShape(anchor,m))){found.set(i,{block:"variableGeometry"});continue;}
    let surface,p;
    try{
      p=await pdf.getPage(i);
      surface=await renderPDFPage(p);
      assertActive(signal);
      const obs=await exploreRaster(surface,layout,whole,signal);
      if(!whole){
        obs.cells=new Map([...obs.cells].map(([k,v])=>[k.replace(/^0:/,i+":"),v]));
      }
      found.set(i,obs);
    }catch(e){assertActive(signal);found.set(i,{block:"renderFailed"});}
    finally{if(surface){surface.canvas.width=1;surface.canvas.height=1;}p?.cleanup();}
  }
  return found;
}

