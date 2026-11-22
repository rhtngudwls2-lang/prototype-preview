import {diagrams,layout} from './geometry.mjs';
const enc=new TextEncoder();
export const point=n=>n*360/127000;
const n=x=>{if(!Number.isFinite(x))throw Error('nonfinite PDF measure');return (Math.abs(x)<0.0000005?0:x).toFixed(6).replace(/\.?0+$/u,'');};
const pt=x=>n(point(x));
function pageStream(g,rows){
 const z=['q','0 J 0 j'];
 function stroke(style,p){z.push(style);if(p)z.push(p);}
 const rect=a=>pt(a[0])+' '+pt(g.PH-a[1]-a[3])+' '+pt(a[2])+' '+pt(a[3])+' re S';
 const line=a=>pt(a[0])+' '+pt(g.PH-a[1])+' m '+pt(a[2])+' '+pt(g.PH-a[3])+' l S';
 for(const p of diagrams(g,rows)){
  if(p.bleed)stroke('0.70 0.34 0.14 RG 0.32 w [1.40 1.10] 0 d',rect(p.bleed));
  stroke('0.12 0.17 0.20 RG 0.48 w [] 0 d',rect(p.trim));
  if(p.safe)stroke('0.13 0.44 0.36 RG 0.32 w [0.80 1.40] 0 d',rect(p.safe));
  if(p.marks.length){stroke('0.10 0.13 0.15 RG 0.34 w [] 0 d');for(const x of p.marks)z.push(line(x));}
 }
 z.push('Q');
 return z.join('\n')+'\n';
}
export function buildPdf(config){
 const g=layout(config);
 if(g.pages.length===0)throw Object.assign(new Error('empty'),{code:'empty'});
 const objs=['<< /Type /Catalog /Pages 2 0 R >>']; 
 const kids=g.pages.map((_,i)=>(3+2*i)+' 0 R').join(' ');
 objs.push('<< /Type /Pages /Count '+g.pages.length+' /Kids [ '+kids+' ] >>');
 for(const [i,sheet] of g.pages.entries()){
  const stream=pageStream(g,sheet), ref=4+2*i;
  objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pt(g.PW)+' '+pt(g.PH)+'] /Resources << >> /Contents '+ref+' 0 R >>');
  objs.push('<< /Length '+enc.encode(stream).length+' >>\nstream\n'+stream+'endstream');
 }
 const offsets=[0];let pdf='%PDF-1.4\n% PrintFit deterministic vector\n';
 for(const [i,obj] of objs.entries()){offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+obj+'\nendobj\n';}
 const xref=pdf.length;
 pdf+='xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('');
 pdf+='trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
 return enc.encode(pdf);
}
