import {DEFAULT,layout,diagrams,PAPERS} from './geometry.mjs';
import {buildPdf} from './pdf.mjs';
const words={
 en:{brandLine:'Label sheet studio',localOnly:'LOCAL WORKSPACE',headline:'Build a label sheet that fits.',lead:'Enter the dimensions in millimeters. Check the layout and export a vector PDF, without uploading anything.',stepOne:'01 / SETUP',setup:'Sheet settings',reset:'Reset sample',paperLegend:'Sheet & output',paper:'Paper',alignment:'Alignment',center:'Centered',corner:'Top-left',rotation:'Rotation',labelLegend:'Label size & pitch',width:'Trim width',height:'Trim height',pitchX:'Horizontal pitch',pitchY:'Vertical pitch',pitchHelp:'Pitch is the distance between matching points on adjacent labels, not the gap.',quantityLegend:'Quantity',rows:'Rows per sheet',cols:'Columns per sheet',count:'Total labels',marginLegend:'Minimum page margins',top:'Top',right:'Right',bottom:'Bottom',left:'Left',marginHelp:'Margins protect the full outline, including bleed, crop marks and an ink buffer.',guideLegend:'Print guides',crop:'Crop marks',stepTwo:'02 / PREVIEW',preview:'Layout preview',pageLabel:'Sheet',trim:'Trim',bleed:'Bleed',safe:'Safe inset',export:'Download vector PDF',printNote:'Print at 100% / Actual size. Turn off “Fit to page”. Printer scale, stock alignment and printable margins are not verified. Measure a test sheet first.',footer:'PrintFit runs locally. It creates blank sheet guides, not print-shop output or a printer guarantee.', ok:'{count} labels · {pages} sheets · capacity {cap} per sheet.',sheet:'{n} labels on this sheet',svg:'Selected label sheet, diagram view only',none:'No labels requested. PDF export is disabled.',invalidPreview:'Enter a valid layout to preview',mm:'{field}: enter millimeters with up to 3 decimals.',whole:'{field}: enter a whole number.',range:'{field}: value is outside the supported range.',outsideX:'Grid exceeds the usable page width.',outsideY:'Grid exceeds the usable page height.',overlapX:'Horizontal pitch is too small. Neighboring outlines including print guides would overlap.',overlapY:'Vertical pitch is too small. Neighboring outlines including print guides would overlap.',unsafe:'Safe inset leaves no usable inside area.',gridLimit:'Use at most 400 grid positions per sheet.',pageLimit:'This layout needs more than 250 sheets. Reduce the quantity or increase sheet capacity.',margins:'Page margins leave no usable area.',general:'Choose supported sheet settings.'},
 ko:{brandLine:'라벨 용지 설계 도구',localOnly:'로컬 작업 공간',headline:'규격에 맞는 라벨 용지를 설계하세요.',lead:'치수를 mm로 입력하고 배치를 확인한 뒤 벡터 PDF로 저장하세요. 파일을 외부로 올리지 않습니다.',stepOne:'01 / 설정',setup:'용지 설정',reset:'예시값 복원',paperLegend:'용지와 배치',paper:'용지',alignment:'정렬',center:'가운데',corner:'왼쪽 위',rotation:'회전',labelLegend:'재단선 치수와 피치',width:'재단 너비',height:'재단 높이',pitchX:'가로 피치',pitchY:'세로 피치',pitchHelp:'피치는 이웃 라벨의 같은 위치 사이 거리입니다. 라벨 사이 빈 간격이 아닙니다.',quantityLegend:'수량',rows:'용지당 행',cols:'용지당 열',count:'총 라벨 수',marginLegend:'용지 최소 여백',top:'위',right:'오른쪽',bottom:'아래',left:'왼쪽',marginHelp:'여백은 도련선, 재단표시, 선 두께 여유까지 포함한 바깥 경계를 보호합니다.',guideLegend:'인쇄 안내선',crop:'재단표시',stepTwo:'02 / 미리보기',preview:'배치 미리보기',pageLabel:'용지 번호',trim:'재단선',bleed:'도련',safe:'안전 여백',export:'벡터 PDF 저장',printNote:'인쇄는 100% / 실제 크기를 선택하고 ‘페이지에 맞추기’를 끄세요. 프린터 배율, 용지 정렬, 인쇄 가능 여백은 확인되지 않았습니다. 시험 인쇄 후 실측하세요.',footer:'PrintFit은 이 컴퓨터에서만 실행됩니다. 빈 안내선 용지이며 인쇄소 완성 파일이나 출력 보증이 아닙니다.',ok:'라벨 {count}개 · 용지 {pages}장 · 장당 최대 {cap}개',sheet:'이 용지에 라벨 {n}개',svg:'선택한 라벨 용지의 도식 미리보기',none:'라벨이 0개입니다. PDF를 저장할 수 없습니다.',invalidPreview:'올바른 치수를 입력하면 미리볼 수 있습니다.',mm:'{field}: 소수점 아래 세 자리까지 mm로 입력하세요.',whole:'{field}: 정수로 입력하세요.',range:'{field}: 지원 범위를 벗어났습니다.',outsideX:'배치가 사용 가능한 용지 너비를 초과합니다.',outsideY:'배치가 사용 가능한 용지 높이를 초과합니다.',overlapX:'가로 간격이 너무 좁아 인쇄 안내선을 포함한 이웃 라벨이 겹칩니다.',overlapY:'세로 간격이 너무 좁아 인쇄 안내선을 포함한 이웃 라벨이 겹칩니다.',unsafe:'안전 여백을 적용하면 내부 공간이 남지 않습니다.',gridLimit:'용지 한 장에 최대 400칸까지 설정하세요.',pageLimit:'250장을 넘습니다. 수량을 줄이거나 장당 배치를 늘리세요.',margins:'여백을 제외하면 쓸 수 있는 용지 공간이 없습니다.',general:'지원되는 용지 설정을 선택하세요.'}
};
const $=s=>document.querySelector(s), form=$('#builder'),pageSel=$('#page-select'),canvas=$('#sheet'),status=$('#status'),exp=$('#export');
let lang=location.pathname==='/ko/'?'ko':'en',g=null,stored=null,prevSheet=0;
const tx=(key,repl={})=>(words[lang][key]??words[lang].general).replace(/\{(\w+)\}/gu,(_,m)=>String(repl[m]??''));
function field(container,key,numeric=true) {
 const l=document.createElement('label'), span=document.createElement('span'), input=document.createElement('input');span.dataset.t=key;
 input.type='text';input.name=key;input.inputMode=numeric?'decimal':'numeric';input.autocomplete='off';input.spellcheck=false;input.maxLength=numeric?16:12; l.append(span,input);$(container).prepend(l);
}
for(const r of [['#size-fields',['width','height','pitchX','pitchY'],true],['#qty-fields',['rows','cols','count'],false],['#margin-fields',['top','right','bottom','left'],true],['#guide-fields',['bleed','safe'],true]])
 for(const k of [...r[1]].reverse())field(r[0],k,r[2]);
const get=key=>form.elements.namedItem(key);
const allKeys=Object.keys(DEFAULT);
function load(config){for(const k of allKeys){const f=get(k);if(k==='crop')f.checked=config[k];else f.value=config[k];}}
function collect(){return Object.fromEntries(allKeys.map(k=>[k,k==='crop'?get(k).checked:get(k).value]));}
const esc=s=>String(s).replace(/[&<>]/gu,x=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[x]));
function draw(){
 const physical=g?[g.PW,g.PH]:(PAPERS[get('paper').value]??PAPERS.a4), [w,h]=physical.map(n=>n/1000);
 canvas.setAttribute('viewBox','0 0 '+w+' '+h);
 let picture='<title id="svg-title">'+esc(tx('svg'))+'</title><rect width="'+w+'" height="'+h+'" fill="#fff" />';
 const endText=!g?tx('invalidPreview'):!g.pages.length?tx('none'):null;
 if(endText)picture+='<text x="'+w*.5+'" y="'+h*.51+'" text-anchor="middle" font-size="5" fill="#58706a">'+esc(endText)+'</text>';
 if(g){
  const mm=x=>x/1000;
  const rect=(a,color,width,dash='')=>'<rect x="'+mm(a[0])+'" y="'+mm(a[1])+'" width="'+mm(a[2])+'" height="'+mm(a[3])+'" stroke="'+color+'" stroke-width="'+width+'" '+(dash?'stroke-dasharray="'+dash+'"':'')+' fill="none"/>';
  const {top,right,bottom,left}=g.margins;
  picture+=rect([left,top,g.PW-left-right,g.PH-top-bottom],'#c9d4ce',.25,'2 2');
  for(const x of diagrams(g,g.pages[Number(pageSel.value)]??[])){
   if(x.bleed)picture+=rect(x.bleed,'#ad5f28',.24,'1.5 .9');
   picture+=rect(x.trim,'#243c36',.38);
   if(x.safe)picture+=rect(x.safe,'#277964',.21,'.8 1');
   for(const a of x.marks)picture+='<line x1="'+mm(a[0])+'" y1="'+mm(a[1])+'" x2="'+mm(a[2])+'" y2="'+mm(a[3])+'" stroke="#233731" stroke-width=".25"/>';
  }
 }
 canvas.innerHTML=picture;
 $('#sheet-summary').textContent=tx('sheet',{n:g?.pages[Number(pageSel.value)]?.length??0});
}
function recalc(){
 stored=null;g=null;exp.disabled=true;status.classList.remove('error');status.removeAttribute('data-code');
 for(const x of form.querySelectorAll('[aria-invalid]'))x.removeAttribute('aria-invalid');
 try{
  const c=collect(), r=layout(c);g=r;stored=c;
  status.textContent=r.count?tx('ok',{count:r.count,pages:r.pages.length,cap:r.cap}):tx('none');
  status.dataset.code=r.count?'valid':'empty';exp.disabled=r.count===0;
 }catch(err){
  status.dataset.code=err?.code??'general';status.textContent=tx(err?.code??'general',{field:tx(err?.field??'general')});
  status.classList.add('error');if(err?.field)get(err.field)?.setAttribute('aria-invalid','true');
 }
 pageSel.replaceChildren();const frag=document.createDocumentFragment();
 for(let i=0;i<Math.max(1,g?.pages.length??0);i++){const o=document.createElement('option');o.value=String(i);o.textContent=(i+1)+' / '+(g?.pages.length??0);frag.appendChild(o);}
 pageSel.append(frag); pageSel.disabled=!g?.pages.length;prevSheet=Math.min(prevSheet,Math.max(0,(g?.pages.length??0)-1));pageSel.value=String(prevSheet);
 draw();
}
function translate(){
 document.documentElement.lang=lang;
 document.title=lang==='ko'?'PrintFit · 라벨 용지 설계 도구':'PrintFit · Label sheet studio';
 for(const e of document.querySelectorAll('[data-t]'))e.textContent=tx(e.dataset.t);
 for(const b of document.querySelectorAll('[data-locale]'))b.setAttribute('aria-pressed',String(b.dataset.locale===lang));
 recalc();
}
form.addEventListener('submit',e=>e.preventDefault());
form.addEventListener('input',recalc);
pageSel.addEventListener('change',()=>{prevSheet=Number(pageSel.value);draw();});
$('#reset').addEventListener('click',()=>{prevSheet=0;load(DEFAULT);recalc();});
for(const b of document.querySelectorAll('[data-locale]'))b.addEventListener('click',()=>{lang=b.dataset.locale;history.replaceState(null,'','/'+lang+'/');translate();});
const pointerRepeatMs=500;
let lastPointerExport=null;
function pdfLayoutKey(q){
 const {x,y}=q.placements[0];
 return JSON.stringify([q.paper,q.W,q.H,q.pitchX,q.pitchY,q.rows,q.cols,q.count,q.safe,q.bleed,q.crop,x,y]);
}
exp.addEventListener('click',event=>{
 if(!stored||!g?.pages.length)return;
 // A native keyboard or assistive activation has no pointer click count.
 const pointer=event.detail>0, at=performance.now(), key=pointer?pdfLayoutKey(g):null;
 if(event.detail>1&&lastPointerExport?.key===key&&at-lastPointerExport.at<=pointerRepeatMs)return;
 const bytes=buildPdf(stored), blob=new Blob([bytes],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='PrintFit-'+g.paper.toUpperCase()+'-'+g.count+'-labels.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
 if(pointer)lastPointerExport={key,at};
});
load(DEFAULT);translate();
