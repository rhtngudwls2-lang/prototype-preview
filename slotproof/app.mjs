import {LIMITS,issue,manifest,validLayout,slotRects,reconcile,toCSV} from "./core.mjs";
import {fixture,sampleLayout} from "./fixtures.mjs";
import {openPDF,closePDF,renderPDFPage,scanPDF} from "./scanner.mjs";
const ko=document.documentElement.lang==="ko";
const words=ko?{
  ready:"검사를 실행할 수 있습니다.",start:"PDF 해석을 시작합니다…",loading:"격자 미리보기를 준비합니다…",scanning:"검사 중",page:"페이지",done:"검사 결과를 확인하세요.",demo:"합성 예제. 미리 정해진 2 × 2 배치를 사용합니다.",normal:"정상 예제 PDF",swap:"자리바꿈 예제 PDF",approved:"승인 예제 CSV",ok:"통과: 모든 승인 위치가 일치합니다.",fail:"통과하지 못했습니다. 아래 이슈를 확인하세요.",reviewOnly:"확인 필요: 아직 통과가 아닙니다.",cleared:"선택 파일과 결과를 지웠습니다.",changed:"배치가 변경됐습니다. 격자를 다시 표시하고 확인하세요.",
  matched:"일치",mismatched:"불일치",missing:"누락",extra:"추가",unknown:"확인 필요",blank:"승인 빈칸",separator:"승인 구분 페이지",
  layoutInvalid:"지원되는 행·열과 여백을 입력하세요 (각 1~16; 좌우 및 상하 여백의 합은 각각 90% 미만).",pdfSize:"비어 있거나 40 MiB를 넘는 PDF입니다.",csvSize:"비어 있거나 4 MiB를 넘는 CSV입니다.",pdfInvalid:"이 파일을 PDF로 열 수 없습니다. 정상적으로 열리는 최종 PDF를 사용하세요.",pdfPassword:"암호로 잠긴 PDF는 지원하지 않습니다.",pageLimit:"PDF는 1~80페이지여야 합니다.",csvEncoding:"CSV를 UTF-8로 저장한 다음 다시 선택하세요.",csvHeader:"CSV 열 이름은 page,row,column,value이고, kind는 선택 항목입니다.",csvEmpty:"CSV에 검수할 데이터가 없습니다.",fieldTooLong:"CSV에 너무 긴 필드가 있습니다.",csvTooMany:"작업의 최대 위치 수를 넘었습니다.",csvQuotes:"CSV 따옴표 형식을 확인하세요.",csvLength:"CSV 레코드의 열 수가 헤더와 다릅니다.",pageInvalid:"잘못된 물리 페이지 번호입니다.",separatorInvalid:"구분 페이지는 해당 페이지를 단 한 줄로 선언하고 행·열·값은 비워 두세요.",kindInvalid:"kind는 code, blank, separator 중 하나여야 합니다.",slotInvalid:"행·열이 입력한 격자 범위를 벗어납니다.",slotDuplicate:"CSV에 같은 위치가 두 번 나옵니다.",valueInvalid:"code는 값이 필요하고 blank는 값이 없어야 합니다.",noCodes:"승인된 QR 코드 위치를 하나 이상 넣으세요.",unsupportedText:"CSV 값에 지원하지 않는 제어 문자가 있습니다.",selectBoth:"최종 PDF와 승인 CSV를 선택하세요.",selectPDF:"최종 인쇄 PDF를 먼저 선택하세요.",needConfirm:"미리보기 격자를 확인하고 배치 확인에 체크하세요.",scanTooLarge:"이 PDF와 격자 조합은 600개 위치 제한을 넘습니다.",fileRead:"선택한 파일을 읽지 못했습니다.",renderFailed:"PDF 페이지를 그리지 못했습니다.",generic:"이 작업을 끝내지 못했습니다. 파일과 배치를 확인하세요.",
  undeclaredSlot:"CSV에 이 위치가 선언되지 않음",undeclaredCode:"선언되지 않은 위치의 QR",missingPage:"승인된 물리 페이지 없음",notScanned:"페이지를 검사하지 못함",unsupportedCode:"지원하지 않는 QR 데이터",unclassifiedMarks:"QR 외의 인쇄 흔적이 남아 직접 확인 필요",ambiguous:"작거나 경계에 걸린 QR / 위치 모호",multipleCodes:"한 위치에 여러 코드",blankHasCode:"승인 빈칸에 QR 있음",approvedBlank:"빈칸으로 확인",unreadableBlank:"잉크가 있어 빈칸이라고 확인할 수 없음",emptySlot:"위치에 보이는 잉크 없음",unreadable:"잉크는 있으나 QR을 읽을 수 없음",same:"문자까지 일치",literalDiff:"문자 값이 다름",undeclaredPage:"승인 CSV에 이 물리 페이지가 없음",missingSeparator:"승인된 구분 페이지 없음",separatorHasCode:"구분 페이지에 QR 있음",approvedSeparator:"빈 구분 페이지 확인",outsideGrid:"격자 바깥의 QR",outsideReview:"격자 바깥 부분을 직접 확인 필요",pageGeometry:"페이지의 크기·회전을 확인할 수 없음",variableGeometry:"페이지 크기 또는 잘림 범위가 다름"
}:{
  ready:"Ready to compare.",start:"Reading the PDF…",loading:"Preparing the grid preview…",scanning:"Checking",page:"Page",done:"The proof report is ready.",demo:"Synthetic example. This uses a known 2 × 2 layout.",normal:"Matching example PDF",swap:"Swapped example PDF",approved:"Approved example CSV",ok:"PASS: all approved positions match.",fail:"NOT A PASS: resolve the issues below.",reviewOnly:"REVIEW REQUIRED: not a pass yet.",cleared:"The files and report were cleared.",changed:"The layout changed. Preview and confirm the grid again.",
  matched:"Matched",mismatched:"Mismatched",missing:"Missing",extra:"Extra",unknown:"Needs review",blank:"Approved blank",separator:"Approved separator",
  layoutInvalid:"Use valid grid rows/columns (1–16) and insets. Opposite insets must total less than 90%.",pdfSize:"The PDF is empty or larger than 40 MiB.",csvSize:"The CSV is empty or larger than 4 MiB.",pdfInvalid:"This file could not be opened as a PDF. Use a readable final print PDF.",pdfPassword:"Password-protected PDFs are not supported.",pageLimit:"The PDF must have 1–80 pages.",csvEncoding:"Save the CSV as UTF-8 and select it again.",csvHeader:"Required columns: page,row,column,value. The kind column is optional.",csvEmpty:"There are no records in the approved CSV.",fieldTooLong:"The CSV contains an oversized field.",csvTooMany:"The manifest exceeds the slot limit.",csvQuotes:"The CSV has malformed quoting.",csvLength:"A CSV record has a different number of columns than the header.",pageInvalid:"Invalid physical page number.",separatorInvalid:"A separator must be its own page record with no row, column or value.",kindInvalid:"Use code, blank or separator in the kind column.",slotInvalid:"The row or column is outside the entered grid.",slotDuplicate:"This physical position is listed twice in the CSV.",valueInvalid:"A code needs a value; a blank must have no value.",noCodes:"Enter at least one approved QR slot.",unsupportedText:"The CSV value contains an unsupported control character.",selectBoth:"Choose a final PDF and approved CSV.",selectPDF:"Choose the final print PDF first.",needConfirm:"Preview the grid and confirm the physical layout.",scanTooLarge:"This PDF and layout exceed the 600-slot scan limit.",fileRead:"The selected file could not be read.",renderFailed:"The PDF page could not be rendered.",generic:"The proof could not finish. Check the files and layout.",
  undeclaredSlot:"This position is not declared in the CSV",undeclaredCode:"QR in an undeclared area",missingPage:"Approved physical page does not exist",notScanned:"Could not check the page",unsupportedCode:"Unsupported QR data",unclassifiedMarks:"Unclassified printed marks remain; review in the PDF",ambiguous:"Tiny, boundary-crossing or ambiguous symbol",multipleCodes:"Multiple codes in one position",blankHasCode:"QR found in approved blank",approvedBlank:"Confirmed empty approved slot",unreadableBlank:"Visible ink; could not verify as empty",emptySlot:"No visible ink in the expected slot",unreadable:"Visible ink; could not decode a QR",same:"Exact literal match",literalDiff:"Literal values differ",undeclaredPage:"This physical page is not declared",missingSeparator:"Approved separator page is missing",separatorHasCode:"QR found on a separator",approvedSeparator:"Confirmed blank separator",outsideGrid:"QR outside the grid",outsideReview:"Area outside the grid needs visual review",pageGeometry:"Page geometry could not be interpreted",variableGeometry:"Page size or crop differs from the confirmed job"
};
const $=id=>document.getElementById(id);
const fields=["rows","columns","top","right","bottom","left"];
const getLayout=()=>Object.fromEntries(fields.map(name=>[name,$(name).value===""?NaN:Number($(name).value)]));
const layoutId=()=>JSON.stringify(getLayout());
let job=1,busy=false,pdfBytes,csvText,pdf,result,previewed="",previewRequest=0,controller;
function status(s){$("message").textContent=s??"";}
function clearError(){$("error").hidden=true;$("error").textContent="";}
function error(e){
  clearError();
  if(e?.code==="cancelled")return;
  $("error").textContent=(words[e?.code]??words.generic)+(e?.info?.length?" ["+e.info.join(", ")+"]":"");
  $("error").hidden=false;status("");
}
function clearReport(){
  result=undefined;$("report-data").hidden=true;$("export").disabled=true;
  $("totals").replaceChildren();$("records").replaceChildren();$("filter").value="all";
  $("verdict").textContent=$("verdict").dataset.empty;$("verdict").className="";
}
$("verdict").dataset.empty=$("verdict").textContent;
function setBusy(v){
  busy=v;
  for(const id of ["sample","sample-swap","pdf-file","csv-file","preview","preview-page",...fields]){
    $(id).disabled=v||(id==="preview-page"&&(!pdf||!previewed));
  }
  options();
}
function options(){
  const ok=previewed===layoutId()&&!!pdf&&validLayout(getLayout());
  $("confirm").disabled=busy||!ok;
  $("scan").disabled=busy||!ok||!$("confirm").checked||csvText===undefined;
}
function resetPreview(){
  previewed="";previewRequest++;
  $("confirm").checked=false;$("confirm").disabled=true;
  $("preview-page").disabled=true;$("preview-page").replaceChildren();
  $("page-canvas").hidden=true;$("page-canvas").width=1;$("page-canvas").height=1;
  $("preview-placeholder").hidden=false;options();
}
function forgetPDF(){
  if(pdf){const old=pdf;pdf=undefined;void closePDF(old).catch(()=>{});}
}
function resetJob(label=true){
  job++;
  controller?.abort();controller=undefined;
  forgetPDF();pdfBytes=csvText=undefined;resetPreview();clearError();clearReport();
  for(const id of ["pdf-file","csv-file"]){$(id).value="";$(id.replace("-file","-name")).textContent="";}
  for(const k of fields)$(k).value=sampleLayout[k];
  setBusy(false);status(label?words.cleared:"");
}
async function obtain(id){
  if(pdf)return pdf;
  if(!pdfBytes)throw issue("selectPDF");
  const item=await openPDF(pdfBytes);
  if(id!==job){await closePDF(item);throw issue("cancelled");}
  pdf=item;return item;
}
function drawGrid(canvas,source,layout){
  canvas.width=source.width;canvas.height=source.height;
  const ctx=canvas.getContext("2d");ctx.drawImage(source,0,0);
  const unit=Math.max(1,Math.floor(canvas.width/325));
  ctx.lineWidth=unit*2;ctx.strokeStyle="#167958";
  ctx.font="bold "+Math.max(10,unit*11)+"px system-ui";
  for(const rect of slotRects(canvas.width,canvas.height,layout)){
    if(rect.w<12||rect.h<12)continue;
    ctx.strokeRect(rect.x+unit,rect.y+unit,rect.w-unit,rect.h-unit);
    const mark=rect.row+","+rect.column;
    const x=rect.x+4*unit,y=rect.y+4*unit;
    ctx.fillStyle="#124635";ctx.fillRect(x,y,ctx.measureText(mark).width+8*unit,17*unit);
    ctx.fillStyle="#fff";ctx.fillText(mark,x+4*unit,y+12*unit);
  }
}
async function preview(id,n=1,{keep=false}={}){
  const request=++previewRequest;
  const layout=getLayout();
  if(!validLayout(layout))throw issue("layoutInvalid");
  const item=await obtain(id);
  const page=await item.getPage(n);
  const {canvas:source}=await renderPDFPage(page,700);
  if(id!==job||request!==previewRequest)throw issue("cancelled");
  drawGrid($("page-canvas"),source,layout);
  $("page-canvas").hidden=false;$("preview-placeholder").hidden=true;
  if(!$("preview-page").options.length){
    for(let i=1;i<=item.numPages;i++){
      const option=document.createElement("option");option.value=i;option.textContent=words.page+" "+i+" / "+item.numPages;$("preview-page").append(option);
    }
  }
  $("preview-page").value=n;
  previewed=layoutId();if(!keep)$("confirm").checked=false;
  options();source.width=1;source.height=1;
}
for(const id of ["pdf","csv"]){
  $(id+"-file").addEventListener("change",async e=>{
    const selected=e.target.files[0]; if(!selected)return;
    job++;const n=job; clearError();clearReport();status("");
    if(id==="pdf"){pdfBytes=undefined;forgetPDF();resetPreview();}
    else csvText=undefined;
    const label=$(id+"-name");label.textContent=selected.name;
    try{
      const max=LIMITS[id];if(!selected.size||selected.size>max)throw issue(id+"Size");
      setBusy(true);
      let bytes;try{bytes=new Uint8Array(await selected.arrayBuffer());}catch{throw issue("fileRead");}
      if(n!==job)return;
      if(id==="pdf"){pdfBytes=bytes;await preview(n);}
      else{
        try{csvText=new TextDecoder("utf-8",{fatal:true}).decode(bytes);}catch{throw issue("csvEncoding");}
      }
      if(n===job&&pdfBytes&&csvText!==undefined)status(words.ready);
    }catch(e){if(n===job)error(e);}finally{if(n===job)setBusy(false);}
  });
}
for(const id of fields)$(id).addEventListener("input",()=>{
  clearError();clearReport();resetPreview();
  if(pdfBytes)status(words.changed);
});
$("confirm").addEventListener("change",options);
$("reset").addEventListener("click",()=>resetJob());
$("preview").addEventListener("click",async()=>{
  const n=job;clearError();setBusy(true);status(words.loading);
  try{await preview(n,Number($("preview-page").value)||1);if(n===job)status(words.ready);}
  catch(e){if(n===job)error(e);}finally{if(n===job)setBusy(false);}
});
$("preview-page").addEventListener("change",async()=>{
  const n=job;clearError();setBusy(true);
  try{await preview(n,Number($("preview-page").value),{keep:true});}
  catch(e){if(n===job){$("confirm").checked=false;error(e);}}finally{if(n===job)setBusy(false);}
});
function displayRows(){
  if(!result)return;
  const list=document.createDocumentFragment();
  for(const r of result.records){
    if($("filter").value==="issues"&&["matched","blank","separator"].includes(r.status))continue;
    const row=document.createElement("tr");row.setAttribute("role","row");row.dataset.status=r.status;row.dataset.coord=[r.page,r.row??0,r.column??0].join(":");
    for(const [i,v] of [r.page,r.row,r.column,words[r.status],r.expected,r.actual,words[r.reason]??r.reason].entries()){
      const td=document.createElement("td");td.setAttribute("role","cell");td.dataset.label=$("report-columns").cells[i].textContent;td.textContent=v??"–";
      if(i===3)td.className="report-status";
      if(i===4||i===5)td.className="literal";
      row.append(td);
    }
    list.append(row);
  }
  $("records").replaceChildren(list);
}
function displayProof(data){
  result=data;
  $("verdict").textContent=result.pass?words.ok:result.counts.mismatched||result.counts.missing||result.counts.extra?words.fail:words.reviewOnly;
  $("verdict").className=result.pass?"pass":"fail";
  const chips=Object.entries(result.counts).filter(([state,n])=>n||!["blank","separator"].includes(state)).map(([state,n])=>{
    const item=document.createElement("div");item.className="metric";item.dataset.status=state;
    const val=document.createElement("strong");val.textContent=n;
    const label=document.createElement("span");label.textContent=words[state];
    item.append(val,label);return item;
  });
  $("totals").replaceChildren(...chips);
  $("report-data").hidden=false;$("export").disabled=false;
  displayRows();
}
async function perform(n){
  if(csvText===undefined||!pdfBytes)throw issue("selectBoth");
  const layout=getLayout();
  if(!$("confirm").checked||previewed!==layoutId())throw issue("needConfirm");
  const expected=manifest(csvText,layout);
  controller=new AbortController();
  const item=await obtain(n);
  const obs=await scanPDF(item,layout,expected,{
    signal:controller.signal,progress:(i,max)=>{if(n===job)status(words.scanning+" "+i+" / "+max+"…");}
  });
  if(n!==job)return;
  displayProof(reconcile(layout,expected,obs,item.numPages));
  status(words.done);
  $("report").focus({preventScroll:true});
  $("report").scrollIntoView({block:"start",behavior:"instant"});
}
$("scan").addEventListener("click",async()=>{
  const n=job;clearError();clearReport();setBusy(true);status(words.start);
  try{await perform(n);}catch(e){if(n===job)error(e);}finally{if(n===job)setBusy(false);}
});
async function demo(type){
  resetJob(false);clearError();setBusy(true);status(words.demo);
  const n=job;
  try{
    const sample=fixture(type);
    pdfBytes=sample.pdf;csvText=sample.csv;
    $("pdf-name").textContent=type==="swap"?words.swap:words.normal;$("csv-name").textContent=words.approved;
    await preview(n);
    if(n!==job)return;
    $("confirm").checked=true;await perform(n);
  }catch(e){if(n===job)error(e);}finally{if(n===job)setBusy(false);}
}
$("sample").addEventListener("click",()=>demo("match"));
$("sample-swap").addEventListener("click",()=>demo("swap"));
$("filter").addEventListener("change",displayRows);
function download(bytes,name,type){
  const href=URL.createObjectURL(new Blob([bytes],{type}));
  const link=document.createElement("a");link.href=href;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(href),10000);
}
$("sample-csv").addEventListener("click",()=>download(fixture("match").csv,"slotproof-approved-example.csv","text/csv;charset=utf-8"));
$("export").addEventListener("click",()=>{if(result)download(toCSV(result),"slotproof-report.csv","text/csv;charset=utf-8");});

