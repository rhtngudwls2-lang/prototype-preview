const $=id=>document.getElementById(id);
const flag="slotproof-mock-receipt-v1";
const out=$("pilot-result");const panel=$("release-panel");
const words=Object.fromEntries([...$("pilot-text").children].map(e=>[e.dataset.state,e.textContent]));
function show(state,grant=false){out.dataset.status=state;out.textContent=words[state];panel.hidden=!grant;}
for(const id of ["success","cancel","failure","restore","clear"])$(id).disabled=false;
$("success").addEventListener("click",()=>{
 try{sessionStorage.setItem(flag,"mock-accepted");show("passed",true);}
 catch{show("storage",true);}
});
$("cancel").addEventListener("click",()=>show("canceled"));
$("failure").addEventListener("click",()=>show("error"));
$("restore").addEventListener("click",()=>{
 try{if(sessionStorage.getItem(flag)==="mock-accepted")show("restored",true);
 else show("absent");}catch{show("absent");}
});
$("clear").addEventListener("click",()=>{
 try{sessionStorage.removeItem(flag);}catch{}
 show("cleared");
});
