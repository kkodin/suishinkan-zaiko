(function(root){
 'use strict';
 /* 祝日：「国民の祝日に関する法律」の規定で計算（2026・2027年は内閣府公表値と一致を確認）。
    春分・秋分は天文計算の近似式（1980〜2099年）。正式日は前年2月の官報で確定するため、2028年以降は公表後に確認すること。 */
 const holidayCache={};
 function nthMonday(y,m,n){const d=new Date(Date.UTC(y,m-1,1));const first=(8-d.getUTCDay())%7+1;return first+(n-1)*7;}
 function yearHolidays(y){if(holidayCache[y])return holidayCache[y];const h={},p=(m,d,n)=>{h[y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')]=n;};
  const k=y-1980,spring=Math.floor(20.8431+0.242194*k-Math.floor(k/4)),autumn=Math.floor(23.2488+0.242194*k-Math.floor(k/4));
  p(1,1,'元日');p(1,nthMonday(y,1,2),'成人の日');p(2,11,'建国記念の日');p(2,23,'天皇誕生日');p(3,spring,'春分の日');p(4,29,'昭和の日');p(5,3,'憲法記念日');p(5,4,'みどりの日');p(5,5,'こどもの日');p(7,nthMonday(y,7,3),'海の日');p(8,11,'山の日');p(9,nthMonday(y,9,3),'敬老の日');p(9,autumn,'秋分の日');p(10,nthMonday(y,10,2),'スポーツの日');p(11,3,'文化の日');p(11,23,'勤労感謝の日');
  const keys=Object.keys(h).sort(),dt=s=>new Date(s+'T00:00:00Z'),fmtD=x=>x.toISOString().slice(0,10);
  for(const key of keys){const x=dt(key);if(x.getUTCDay()===0){const n=new Date(x);do{n.setUTCDate(n.getUTCDate()+1);}while(h[fmtD(n)]);h[fmtD(n)]='振替休日';}}
  for(const key of Object.keys(h).sort()){const n=dt(key);n.setUTCDate(n.getUTCDate()+2);if(h[fmtD(n)]){const mid=dt(key);mid.setUTCDate(mid.getUTCDate()+1);const m=fmtD(mid);if(!h[m]&&mid.getUTCDay()!==0)h[m]='国民の休日';}}
  return holidayCache[y]=h;}
 const holidays=new Proxy({},{get:(_,d)=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)?yearHolidays(+d.slice(0,4))[d]:undefined});
 const date=d=>new Date(d+'T00:00:00Z'),iso=d=>d.toISOString().slice(0,10),add=(d,n)=>{let x=date(d);x.setUTCDate(x.getUTCDate()+n);return iso(x);},round=x=>Math.round(x*1e6)/1e6;
 const todayJST=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date());
 const defaults=()=>{const t=todayJST();return {name:'推進管管理（新規案件）',spec:'',total:100,start:t,end:add(t,120),siteStart:add(t,45),daily:2,truck:20,curing:0,lead:0,finalPartial:true,initialFactory:0,initialSite:0,initialUsed:0,rules:[{from:1,to:100,rate:3}],types:[{from:1,to:100,name:'標準管'}],prodRules:[],calendars:{factory:{week:[0,6],holiday:true},transport:{week:[0],holiday:true},site:{week:[0],holiday:true}},breaks:[],workdays:[]};};
 function rest(s,d,target){if(s.workdays.some(x=>x.date===d&&(x.target===target||x.target==='all')))return '';const b=s.breaks.find(x=>x.from<=d&&x.to>=d&&(x.target===target||x.target==='all'));if(b)return b.name||'休工';let c=s.calendars[target];if(c.holiday&&holidays[d])return holidays[d];if(c.week.includes(date(d).getUTCDay()))return '定休';return '';}
 function validate(s){let e=[];if(!s||!Array.isArray(s.rules)||!Array.isArray(s.types)||!Array.isArray(s.breaks)||!Array.isArray(s.workdays)||!s.calendars||['factory','site','transport'].some(k=>!s.calendars[k]||!Array.isArray(s.calendars[k].week)))return ['設定の形式が不正です'];for(const k of ['total','daily','truck'])if(!Number.isInteger(s[k])||s[k]<=0)e.push(k+'は正の整数です');for(const k of ['curing','lead','initialFactory','initialSite'])if(!Number.isInteger(s[k])||s[k]<0)e.push(k+'は0以上の整数です');if(!Number.isFinite(s.initialUsed)||s.initialUsed<0)e.push('初期使用数が不正です');if(!/^\d{4}-\d{2}-\d{2}$/.test(s.start)||!/^\d{4}-\d{2}-\d{2}$/.test(s.end)||!/^\d{4}-\d{2}-\d{2}$/.test(s.siteStart)||s.end<s.start||s.siteStart<s.start||s.siteStart>s.end||date(s.end)-date(s.start)>86400000*1095)e.push('期間は開始日から3年以内、施工開始日は期間内です');if(s.initialFactory+s.initialSite+s.initialUsed>s.total)e.push('初期数量が総本数を超えています');let p=1;for(const r of s.rules){if(!Number.isInteger(r.from)||!Number.isInteger(r.to)||r.from!==p||r.to<r.from||!Number.isFinite(r.rate)||r.rate<=0)e.push('施工区間は1本目から隙間・重複なく、日量は0より大きく設定してください');p=r.to+1;}if(p!==s.total+1)e.push('施工区間の終点を総本数に合わせてください');for(const b of s.breaks)if(!b.from||!b.to||b.from>b.to)e.push('休工期間が不正です');if(s.prodRules!==undefined&&!Array.isArray(s.prodRules))e.push('製造ペースの形式が不正です');for(const p of (s.prodRules||[]))if(!p.from||!p.to||p.from>p.to||!Number.isInteger(p.daily)||p.daily<0)e.push('製造ペースは開始日≦終了日、日量は0以上の整数です');return [...new Set(e)];}
 function dailyOn(s,d){let n=s.daily;for(const p of (s.prodRules||[]))if(p.from&&p.to&&p.from<=d&&d<=p.to)n=p.daily;return n;}
 /* 総本数に合わせて最後の区間・管種の終わりを自動調整（保存前に使用） */
 function normalize(s){const notes=[];for(const [key,label] of [['rules','施工ペース'],['types','管種']]){const list=s[key]||[];if(!list.length){if(key==='types')list.push({from:1,to:s.total,name:'標準管'});continue;}const last=list[list.length-1];if(last.to!==s.total&&last.from<=s.total){notes.push(label+'の最後を'+last.to+'本目→'+s.total+'本目に合わせました');last.to=s.total;}
  while(list.length&&list[list.length-1].from>s.total){list.pop();notes.push(label+'で総本数を超える行を削除しました');}if(list.length&&list[list.length-1].to!==s.total){list[list.length-1].to=s.total;}}return notes;}
 function demand(s,used){let left=1,n=0,pos=used;for(const r of s.rules){if(pos>=r.to)continue;if(pos<r.from-1)break;let take=Math.min(r.to-pos,r.rate*left);n+=take;pos+=take;left-=take/r.rate;if(left<1e-9)break;}return round(Math.min(n,s.total-used));}
 function run(s,records={},mode='plan'){
 let f=s.initialFactory,site=s.initialSite,used=s.initialUsed,made=0,shipped=0,arrived=0,transit=0;let batches=[{day:s.start,n:s.initialFactory}],deliveries={},rows=[];
 for(let d=s.start;d<=s.end;d=add(d,1)){
  let rec=records[d]||{},r={date:d,offFactory:rest(s,d,'factory'),offTransport:rest(s,d,'transport'),offSite:rest(s,d,'site')};
  let plan=mode==='plan',o=plan?(rec.plan||{}):(rec.actual||{}),has=k=>Object.prototype.hasOwnProperty.call(o,k)&&o[k]!==''&&o[k]!==null;
  r.production=has('production')?+o.production:(plan&&!r.offFactory?Math.min(dailyOn(s,d),Math.max(0,s.total-s.initialFactory-s.initialSite-s.initialUsed-made)):0);
  if(r.production)batches.push({day:add(d,s.curing),n:r.production});f+=r.production;made+=r.production;
  let cured=batches.filter(b=>b.day<=d).reduce((a,b)=>a+b.n,0),complete=made+s.initialFactory+s.initialSite+s.initialUsed>=s.total;
  r.shipment=has('shipment')?+o.shipment:(plan&&!r.offTransport?((s.finalPartial&&complete&&cured>=f)?Math.max(0,f):Math.max(0,Math.floor(cured/s.truck)*s.truck)):0);
  let remain=r.shipment;for(const b of batches){if(b.day>d)continue;let n=Math.min(b.n,remain);b.n-=n;remain-=n;if(!remain)break;}f-=r.shipment;shipped+=r.shipment;transit+=r.shipment;
  if(plan&&r.shipment){let arrival=add(d,s.lead);while(rest(s,arrival,'transport')&&arrival<=add(s.end,366))arrival=add(arrival,1);deliveries[arrival]=(deliveries[arrival]||0)+r.shipment;}
  r.arrival=has('arrival')?+o.arrival:(plan?(deliveries[d]||0):0);arrived+=r.arrival;transit-=r.arrival;site+=r.arrival;
  r.usage=has('usage')?+o.usage:(plan&&d>=s.siteStart&&!r.offSite?demand(s,used):0);let before=used;used=round(used+r.usage);site=round(site-r.usage);
  Object.assign(r,{factory:round(f),transit:round(transit),site,used,manufactured:made,shipped,arrived,remaining:round(s.total-used),trucks:Math.ceil(r.shipment/s.truck),note:rec.note||'',recorded:!!rec.actual,types:s.types.map(t=>({name:t.name,n:round(Math.max(0,Math.min(used,t.to)-Math.max(before,t.from-1)))})).filter(t=>t.n>0)});
  r.errors=[];if(f<0)r.errors.push('工場在庫不足');if(transit<0)r.errors.push('出荷数より搬入数が多い');if(site<0)r.errors.push('現場在庫不足');if(used>s.total)r.errors.push('総本数超過');if(made+s.initialFactory+s.initialSite+s.initialUsed>s.total)r.errors.push('製造超過');if(remain>0)r.errors.push('養生前または製造前の出荷');rows.push(r);
 }
 return rows;
 }
 /* 現場在庫不足の対策案：①施工開始を遅らせる ②日進を抑える ③中断して再開日を決める */
 function sim(x,records){const rows=run(x,records,'plan');const short=rows.find(r=>r.site<-1e-6);const done=rows.find(r=>r.used>=x.total-1e-6);return {short:short||null,done:done?done.date:null};}
 function proposals(s,records={}){
  const ext=JSON.parse(JSON.stringify(s));ext.end=add(s.end,400);ext.prodRules=ext.prodRules||[];
  const base=sim(ext,records);if(!base.short)return null;
  const limit=add(s.end,365),out={shortDate:base.short.date,shortQty:round(-base.short.site),baseDone:base.done,options:[]};
  // ① 施工開始日を遅らせる
  for(let d=add(s.siteStart,1);d<=limit;d=add(d,1)){if(rest(ext,d,'site'))continue;const x={...ext,siteStart:d},r=sim(x,records);if(!r.short&&r.done){out.options.push({type:'delay',siteStart:d,done:r.done});break;}}
  // ② 日進を抑える（0.5本刻み）
  const maxRate=Math.max(...s.rules.map(r=>r.rate));
  for(let rate=Math.floor((maxRate-0.01)/0.5)*0.5;rate>=0.5;rate=round(rate-0.5)){const x={...ext,rules:ext.rules.map(r=>({...r,rate:Math.min(r.rate,rate)}))},r=sim(x,records);if(!r.short&&r.done){out.options.push({type:'rate',rate,done:r.done});break;}}
  // ③ 不足日から中断し、以後不足しない最初の日に再開
  const F=base.short.date;
  for(let R=add(F,1);R<=limit;R=add(R,1)){const x={...ext,breaks:[...ext.breaks,{from:F,to:add(R,-1),target:'site',name:'材料待ち中断'}]};if(rest(x,R,'site'))continue;const r=sim(x,records);if(!r.short&&r.done){out.options.push({type:'pause',from:F,to:add(R,-1),resume:R,done:r.done});break;}}
  return out;
 }
 function applyProposal(s,o){const x=JSON.parse(JSON.stringify(s));if(o.type==='delay')x.siteStart=o.siteStart;else if(o.type==='rate')x.rules=x.rules.map(r=>({...r,rate:Math.min(r.rate,o.rate)}));else if(o.type==='pause')x.breaks.push({from:o.from,to:o.to,target:'site',name:'材料待ち中断（再開 '+o.resume+'）'});if(o.done>x.end)x.end=o.done;return x;}
 const api={normalize,holidays,yearHolidays,defaults,date,iso,add,round,rest,validate,demand,run,dailyOn,proposals,applyProposal};if(typeof module!=='undefined')module.exports=api;root.PipeEngine=api;
})(typeof window!=='undefined'?window:globalThis);
