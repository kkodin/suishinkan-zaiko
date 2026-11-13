const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('cloud.js','utf8').replace('root.PipeCloud={','folder={drive:"test",id:"folder"};token="test-only";expires=Date.now()+60000;root.PipeCloud={');
async function scenario({statuses=[200],missing=false,fullOnly=false,batchStatus=302,batchBody,batchHeaders={Location:'https://download.invalid/from-batch'}}={}){
 let metaCalls=0,downloads=0,writes=0,batches=0;const paths=[];
 const context={window:{},Date,URL,Uint8Array,TextEncoder,btoa:s=>Buffer.from(s,'binary').toString('base64'),fetch:async(url,opts)=>{
  paths.push(url);
  if(url.endsWith('/$batch')){batches++;const req=JSON.parse(opts.body).requests;assert.equal(req[0].method,'GET');assert.ok(req[0].url.endsWith('/content'));return{ok:true,json:async()=>({responses:[{id:'read',status:batchStatus,body:batchBody,headers:batchHeaders}]})};}
  if(opts?.method)writes++;
  if(url.includes('/children?'))return{ok:true,json:async()=>({value:[{id:'event',name:'pipe-event-abcd.json'}]})};
  if(url.startsWith('https://graph.microsoft.com/')){metaCalls++;return{ok:true,json:async()=>missing||(fullOnly&&url.includes('?'))?{id:'event',file:{}}:{'@microsoft.graph.downloadUrl':'https://download.invalid/file'+metaCalls}};}
  const status=statuses[Math.min(downloads++,statuses.length-1)];if(status==='network')throw Error('network');return{ok:status===200||status==='json',status,json:async()=>{if(status==='json')throw Error('invalid JSON');return{id:'test-event'};}};
 }};vm.createContext(context);vm.runInContext(code,context);
 try{return{events:await context.window.PipeCloud.list(),metaCalls,downloads,writes,batches,paths};}catch(error){return{error:error.message,metaCalls,downloads,writes,batches,paths};}
}
(async()=>{
 let r=await scenario();assert.equal(r.events.length,1);assert.equal(r.writes,0);
 r=await scenario({statuses:[403,200]});assert.equal(r.events.length,1);assert.equal(r.metaCalls,2);
 r=await scenario({statuses:[403,403]});assert.match(r.error,/HTTP 403/);assert.match(r.error,/pipe-event-abcd.json/);
 r=await scenario({statuses:['network','network']});assert.match(r.error,/通信エラー/);
 r=await scenario({statuses:[500,200]});assert.equal(r.events.length,1);
 r=await scenario({statuses:['json']});assert.match(r.error,/JSON/);
 r=await scenario({fullOnly:true});assert.equal(r.events.length,1);assert.equal(r.metaCalls,2);assert.equal(r.batches,0);
 r=await scenario({missing:true});assert.equal(r.events.length,1);assert.equal(r.batches,1);assert.equal(r.writes,0);
 r=await scenario({missing:true,batchStatus:200,batchBody:{id:'body-event'}});assert.equal(r.events[0].id,'body-event');
 r=await scenario({missing:true,batchStatus:403,batchBody:{error:{message:'Access denied'}}});assert.match(r.error,/HTTP 403/);assert.match(r.error,/Access denied/);assert.equal(r.writes,0);
 console.log('PASS 10 history-read scenarios, including missing download URL and read-only batch redirects');
})().catch(e=>{console.error(e);process.exitCode=1;});
