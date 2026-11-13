(function(root){
 'use strict';
 const source={get:s=>s.referencePlan||null};
 source.validate=function(v){const valid=d=>{try{return /^\d{4}-\d{2}-\d{2}$/.test(d)&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;}catch{return false;}};if(!v||v.format!=='pipe-reference-v1'||!Number.isInteger(v.total)||v.total<=0||!valid(v.start)||!valid(v.end)||v.start>v.end||!v.production||!Array.isArray(v.shipments))throw Error('受領工程表データの形式が不正です');for(const [d,n] of Object.entries(v.production))if(!valid(d)||d<v.start||d>v.end||!Number.isInteger(n)||n<0)throw Error('受領工程表の製造日・本数が不正です');for(const x of v.shipments)if(!valid(x.date)||x.date<v.start||x.date>v.end||!Number.isInteger(x.qty)||x.qty<0)throw Error('受領工程表の出荷日・本数が不正です');return structuredClone(v);};
 source.settings=function(current,shipping){const ref=source.get(current);if(!ref)throw Error('先に受領工程表データを読み込んでください');return {...structuredClone(current),scheduleMode:'received',receivedProduction:structuredClone(ref.production),shipmentSchedule:structuredClone(shipping||ref.shipments),end:current.end<ref.end?ref.end:current.end};};
 source.propose=function(E,current){
  const ref=source.get(current);if(!ref||current.curing!==0||current.lead!==0)return null;
  const s=source.settings({...current,inlinePlan:{}},[]),r=E.run(s),proposed=[];let f=s.initialFactory,site=s.initialSite;
  for(let i=0;i<r.length;i++){let day=r[i];f+=day.production;const first=ref.shipments[0];let needed=day.date===first?.date?first.qty:Math.max(0,day.usage+day.pitUsage-site);if(!E.rest(s,day.date,'transport')&&needed>0){let qty=Math.min(f,s.truck,day.date===first?.date?first.qty:s.truck);if(qty>0){proposed.push({date:day.date,qty});f-=qty;site+=qty;}}site=E.round(site-day.usage-day.pitUsage);}
  return {shipments:proposed,rows:E.run(source.settings(current,proposed))};
 };
 root.PipeReceivedPlan=source;if(typeof module!=='undefined')module.exports=source;
})(typeof window!=='undefined'?window:globalThis);
