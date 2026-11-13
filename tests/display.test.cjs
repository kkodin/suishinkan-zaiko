const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),cp=require('child_process');
const E=require('../engine.js'),P=require('../planning.js');
const baseline=cp.execFileSync('git',['show','3cb3dc7:app.js'],{encoding:'utf8'});
const oldRender=baseline.slice(baseline.indexOf(' function monthTable('),baseline.indexOf(' function round2('));
const nodes=new Map(),node=()=>({innerHTML:'',classList:{toggle(){}},querySelectorAll(){return[];}});
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},querySelectorAll(){return[];},addEventListener(){}};
const ctx={E,PipeEngine:E,PipePlanning:P,document,Intl,Date,Set,Map,Number,Object,String,window:{},console};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('interaction.js','utf8'),ctx);
const ui=ctx.window.PipeInteraction({get:()=>({})});
const labels=html=>[...html.matchAll(/<tr class="(?!paceTrack|monthBand)([^"]*)">([\s\S]*?)<\/tr>/g)].map(m=>[...m[2].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/g)].map(c=>c[1].replace(/<[^>]*>/g,'')));
let count=0;
for(const mode of ['plan','actual']){
 const settings=E.defaults();Object.assign(settings,{start:'2026-11-19',end:'2027-03-01',siteStart:'2027-01-06',total:12,daily:2,truck:4,initialFactory:0,initialSite:0,initialUsed:0,rules:[{from:1,to:12,rate:3}],types:[{from:1,to:12,name:'TEST'}]});
 const records={'2026-11-19':{actual:{production:2}},'2027-01-06':{actual:{usage:3}}},rows=E.run(settings,records,mode);
 Object.assign(ctx,{settings,records,rows,mode,fmt:n=>Number(n).toLocaleString('ja-JP',{maximumFractionDigits:2}),esc:v=>String(v??''),modeLabel:()=>mode==='plan'?'計画':'実績'});vm.runInContext(oldRender,ctx);
 for(const month of ['2026-11','2026-12','2027-01','2027-02','2027-03']){
  ui.renderCalendar({settings,records,rows,mode,month,today:'2026-11-13'});
  assert.deepEqual(labels(nodes.get('calendar').innerHTML),labels(ctx.monthTable(month,false)),mode+' '+month+' rows and every visible cell must match previously published display');count++;
 }
}
console.log('PASS original row order and every cell display: '+count+' month/mode comparisons');



