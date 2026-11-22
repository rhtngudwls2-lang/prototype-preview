import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
const root=import.meta.dirname;
const staticPaths=new Map([['/','index.html'],['/en/','index.html'],['/ko/','index.html'],['./styles.css','styles.css'],['./app.mjs','app.mjs'],['/geometry.mjs','geometry.mjs'],['/pdf.mjs','pdf.mjs']]);
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const csp="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'";
export async function serve(port=47836){
 const cache=new Map();for(const file of new Set(staticPaths.values()))cache.set(file,await fs.readFile(path.join(root,file)));
 const server=createServer((req,res)=>{
  const host=req.headers.host??'', local=server.address()?.port;
  if(host!=='127.0.0.1:'+local){res.writeHead(421,{'Connection':'close'}).end();return;}
  const headers={'Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive','Cross-Origin-Resource-Policy':'same-origin'};
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{...headers,'Allow':'GET, HEAD'}).end();return;}
  const file=staticPaths.get(req.url);
  if(!file){res.writeHead(404,{...headers,'Content-Type':'text/plain; charset=utf-8'}).end(req.method==='HEAD'?null:'Not found');return;}
  const b=cache.get(file);
  res.writeHead(200,{...headers,'Content-Type':types[path.extname(file)],'Content-Length':b.length}).end(req.method==='HEAD'?null:b);
 });
 await new Promise((resolve,reject)=>{server.on('error',reject);server.listen(port,'127.0.0.1',resolve);});
 return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.join(root,'server.mjs')){
 const port=process.argv[2]===undefined?47836:Number(process.argv[2]);if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid local port');
 const s=await serve(port);
 console.log('PrintFit local only: http://127.0.0.1:'+s.address().port+'/');
}
