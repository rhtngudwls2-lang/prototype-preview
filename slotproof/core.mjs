export const LIMITS=Object.freeze({pdf:40*1024*1024,csv:4*1024*1024,pages:80,slots:600,axis:16,payload:4096,pixels:7000000});
export const key=(p,r,c)=>p+":"+r+":"+c;
export const issue=(code,...info)=>Object.assign(new Error(code),{code,info});
export function parseCSV(text){
  text=text.replace(/^\uFEFF/u,"");
  let rows=[], row=[], field="", state=0;
  function put(){if(field.length>LIMITS.payload)throw issue("fieldTooLong");row.push(field);field="";state=0;}
  function line(){put();if(!(row.length===1 && row[0]===""))rows.push(row);row=[];if(rows.length>LIMITS.slots+LIMITS.pages+1)throw issue("csvTooMany");}
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(state===2){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{state=3;}}else{field+=c;}continue;}
    if(c===","){put();continue;}
    if(c==="\r"||c==="\n"){if(c==="\r"&&text[i+1]==="\n")i++;line();continue;}
    if(state===3||c==='"'&&state===1)throw issue("csvQuotes");
    if(c==='"'){state=2;}else{field+=c;state=1;}
  }
  if(state===2)throw issue("csvQuotes");
  if(field!==""||row.length||state)line();
  return rows;
}
export function manifest(text,layout){
  const {rows,columns}=layout;
  if(!validLayout(layout))throw issue("layoutInvalid");
  const data=parseCSV(text);
  if(!data.length)throw issue("csvEmpty");
  const head=data.shift().map(x=>x.trim().toLowerCase());
  const base=["page","row","column","value"];
  if(head.length<4||head.length>5||new Set(head).size!==head.length||!base.every(x=>head.includes(x))||head.some(x=>!base.includes(x)&&x!=="kind"))throw issue("csvHeader");
  if(!data.length)throw issue("csvEmpty");
  const ix=Object.fromEntries(head.map((x,i)=>[x,i]));
  const pages=new Map();
  const uint=(value,max)=>/^[1-9]\d*$/u.test(value)&&+value<=max?+value:null;
  for(const [n,item] of data.entries()){
    const line=n+2;
    if(item.length!==head.length)throw issue("csvLength",line);
    const page=uint(item[ix.page].trim(),LIMITS.pages);
    if(!page)throw issue("pageInvalid",line);
    const kind=(item[ix.kind]||"code").trim().toLowerCase();
    const value=item[ix.value];
    if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value))throw issue("unsupportedText",line);
    if(!pages.has(page))pages.set(page,{separator:false,slots:new Map()});
    const group=pages.get(page);
    if(kind==="separator"){
      if(group.separator||group.slots.size||item[ix.row]!==""||item[ix.column]!==""||value!=="")throw issue("separatorInvalid",line);
      group.separator=true; continue;
    }
    if(group.separator)throw issue("separatorInvalid",line);
    if(kind!=="code"&&kind!=="blank")throw issue("kindInvalid",line);
    const row=uint(item[ix.row].trim(),rows),column=uint(item[ix.column].trim(),columns);
    if(!row||!column)throw issue("slotInvalid",line);
    if((kind==="code")!==(value!==""))throw issue("valueInvalid",line);
    const lookup=key(page,row,column);
    if(group.slots.has(lookup))throw issue("slotDuplicate",page,row,column);
    group.slots.set(lookup,{page,row,column,value,kind});
  }
  if(![...pages.values()].some(g=>[...g.slots.values()].some(slot=>slot.kind==="code")))throw issue("noCodes");
  if([...pages.values()].reduce((count,g)=>count+g.slots.size,0)>LIMITS.slots)throw issue("csvTooMany");
  return pages;
}
export function validLayout(l){
  const {rows,columns,top,right,bottom,left}=l;
  return [rows,columns].every(n=>Number.isInteger(n)&&n>=1&&n<=LIMITS.axis)&&
    [top,right,bottom,left].every(x=>Number.isFinite(x)&&x>=0&&x<=80)&&
    top+bottom<90&&left+right<90;
}
export function slotRects(w,h,l){
  const left=w*l.left/100,top=h*l.top/100;
  const cellW=w*(1-(l.left+l.right)/100)/l.columns,cellH=h*(1-(l.top+l.bottom)/100)/l.rows;
  return Array.from({length:l.rows*l.columns},(_,index)=>{
    const r=Math.floor(index/l.columns),c=index%l.columns;
    const x=Math.floor(left+c*cellW),y=Math.floor(top+r*cellH),maxX=Math.floor(left+(c+1)*cellW),maxY=Math.floor(top+(r+1)*cellH);
    return {x,y,w:maxX-x,h:maxY-y,row:r+1,column:c+1};
  });
}
export function pageShape(page){
  const vp=page.getViewport({scale:1});
  const view=page.view.map(Number);
  const valid=Number.isInteger(vp.rotation)&&[0,90,180,270].includes(vp.rotation)&&[vp.width,vp.height, ...view].every(Number.isFinite)&&vp.width>0&&vp.height>0;
  return {valid,width:vp.width,height:vp.height,rotation:vp.rotation,view,userUnit:page.userUnit};
}
export function sameShape(a,b){
  const same=(x,y)=>Math.abs(x-y)<=0.05;
  return a.valid&&b.valid&&same(a.width,b.width)&&same(a.height,b.height)&&same(a.userUnit,b.userUnit)&&a.view.every((x,i)=>same(x,b.view[i]));
}
export function reconcile(layout,pages,observations,total){
  const records=[];
  const add=(page,row,column,status,reason,expected="",actual="")=>records.push({page,row,column,status,reason,expected,actual});
  function one(page,row,column,s,o){
    const expected=s?.value??"";
    if(!s){add(page,row,column,"unknown","undeclaredSlot");for(const v of o?.payloads??[])add(page,row,column,"extra","undeclaredCode","",v);return;}
    if(o?.missingPage){add(page,row,column,s.kind==="code"?"missing":"unknown","missingPage",expected);return;}
    if(!o||o.unreliable){add(page,row,column,"unknown",o?.reason??"notScanned",expected);return;}
    const values=o.payloads;
    const undecided=o.unsupported?"unsupportedCode":o.ambiguous?"ambiguous":o.residue?"unclassifiedMarks":null;
    if(s.kind==="blank"){
      for(const v of values)add(page,row,column,"extra","blankHasCode","",v);
      if(undecided)add(page,row,column,"unknown",undecided);
      else if(!values.length){
        if(o.clear)add(page,row,column,"blank","approvedBlank");
        else add(page,row,column,"unknown","unreadableBlank");
      }
      return;
    }
    if(values.length>1){
      const keep=values.indexOf(expected);
      add(page,row,column,"unknown","multipleCodes",expected,keep<0?"":expected);
      for(const [i,v] of values.entries())if(i!==keep)add(page,row,column,"extra","multipleCodes","",v);
      return;
    }
    if(undecided){add(page,row,column,"unknown",undecided,expected,values[0]??"");return;}
    const got=values[0];
    if(got===undefined){add(page,row,column,o.clear?"missing":"unknown",o.clear?"emptySlot":"unreadable",expected);return;}
    add(page,row,column,got===expected?"matched":"mismatched",got===expected?"same":"literalDiff",expected,got);
  }
  const last=Math.max(total,...pages.keys());
  for(let page=1;page<=last;page++){
    const exp=pages.get(page), obs=observations.get(page);
    if(!exp){add(page,null,null,"unknown","undeclaredPage");for(const u of obs?.other??[])add(page,null,null,"extra","undeclaredCode","",u);continue;}
    if(exp.separator){
      if(page>total)add(page,null,null,"missing","missingSeparator");
      else if(!obs||obs.block)add(page,null,null,"unknown",obs?.block??"notScanned");
      else if(obs.other.length){for(const u of obs.other)add(page,null,null,"extra","separatorHasCode","",u);if(obs.uncertain)add(page,null,null,"unknown","unreadableBlank");}
      else if(obs.clear)add(page,null,null,"separator","approvedSeparator");
      else add(page,null,null,"unknown","unreadableBlank");
      continue;
    }
    if(page<=total&&obs?.block){add(page,null,null,"unknown",obs.block);continue;}
    for(let row=1;row<=layout.rows;row++)for(let col=1;col<=layout.columns;col++){
      const id=key(page,row,col);
      one(page,row,col,exp.slots.get(id),page>total?{missingPage:true}:obs?.cells.get(id));
    }
    for(const u of obs?.other??[])add(page,null,null,"extra","outsideGrid","",u);
    if(obs?.uncertain)add(page,null,null,"unknown",obs.reason??"outsideReview");
  }
  const counts=Object.fromEntries(["matched","mismatched","missing","extra","unknown","blank","separator"].map(s=>[s,records.filter(r=>r.status===s).length]));
  return {records,counts,pass:counts.matched>0&&!(counts.mismatched||counts.missing||counts.extra||counts.unknown)};
}
const quote=x=>'"'+String(x??"").replaceAll('"','""')+'"';
export function toCSV(result){
  // JSON literals retain leading zeros, quotes, newlines and spreadsheet formula safety.
  return "\uFEFFpage,row,column,status,reason,expected_json,actual_json\r\n"+result.records.map(r=>[
    r.page,r.row,r.column,r.status,r.reason,JSON.stringify(r.expected),JSON.stringify(r.actual)
  ].map(quote).join(",")).join("\r\n")+"\r\n";
}
