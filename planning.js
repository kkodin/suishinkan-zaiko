(function(root){
 'use strict';
 const clone=x=>structuredClone(x),round=x=>Math.round(x*1e6)/1e6;
 function number(value,key){if(value==='')return null;const n=Number(value);if(!Number.isFinite(n)||n<0||n>100000||(!['usage','pitUsage'].includes(key)&&!Number.isInteger(n)))throw Error(['usage','pitUsage'].includes(key)?'0以上の本数を入力してください':'0以上の整数を入力してください');return n;}
 function editCell(settings,date,key,value){const s=clone(settings);s.inlinePlan??={};s.inlinePlan[date]??={};s.inlinePlan[date][key]=value;return s;}
 function moveShipment(settings,rows,from,to){if(from===to)return clone(settings);const a=rows.find(r=>r.date===from),b=rows.find(r=>r.date===to);if(!a||!b)throw Error('計画期間内の日付へ移動してください');if(!(a.shipment>0))throw Error('移動する出荷がありません');let s=clone(settings);for(const r of rows)s=editCell(s,r.date,'shipment',r.shipment);s=editCell(s,from,'shipment',0);s=editCell(s,to,'shipment',round(a.shipment+b.shipment));s.planLabel='出荷日を直接編集した計画';return s;}
 function periods(settings,rows){if(Array.isArray(settings.usagePeriods))return clone(settings.usagePeriods);const list=[];let last=null;for(const r of rows){if(!(r.usage>0))continue;const rate=settings.rules.find(rule=>r.used-r.usage<rule.to-1e-9)?.rate??r.paceRuleRate??r.paceRate??r.usage;if(last&&Math.abs(last.rate-(rate))<1e-5){last.to=r.date;}else{last={id:'period-'+list.length,from:r.date,to:r.date,rate};list.push(last);}}if(!list.length)list.push({id:'period-0',from:settings.siteStart,to:settings.end,rate:settings.rules[0]?.rate||3});return list;}
 function validatePeriods(list,start,end){const sorted=[...list].sort((a,b)=>a.from.localeCompare(b.from));for(let i=0;i<sorted.length;i++){const p=sorted[i];if(!p.from||!p.to||p.from>p.to||p.from<start||p.to>end||!Number.isFinite(p.rate)||p.rate<=0||p.rate>100000)throw Error('日進範囲は計画期間内の日付と0より大きい日量を指定してください');if(i&&sorted[i-1].to>=p.from)throw Error('日進範囲が重なっています。日付を調整してください');}return sorted;}
 function applyPeriods(settings,list,E){const s=clone(settings);s.usagePeriods=validatePeriods(list,s.start,E.add(s.start,1095));const end=s.usagePeriods.at(-1)?.to;if(end&&end>s.end)s.end=end;return s;}
 function linkBoundary(list,index,key,value){
  if(!['from','to'].includes(key)||!Number.isInteger(value)||value<1)throw Error('本目は1以上の整数で入力してください');
  const next=clone(list),row=next[index];if(!row)throw Error('区間が見つかりません');
  const min=key==='from'?(index?next[index-1].from+1:1):row.from;
  const max=key==='from'?row.to:(index+1<next.length?next[index+1].to-1:100000);
  if(value<min||value>max||(key==='from'&&index===0&&value!==1))throw Error('隣の区間が空にならない本目を指定してください');
  row[key]=value;if(key==='to'&&index+1<next.length)next[index+1].from=value+1;
  if(key==='from'&&index>0)next[index-1].to=value-1;return next;
 }
 function bindRanges(container,rowSelector,fromSelector,toSelector){
  container.oninput=event=>{
   const rows=[...container.querySelectorAll(rowSelector)],index=rows.findIndex(row=>row.contains(event.target));if(index<0)return;
   const fields=rows.map(row=>({from:row.querySelector(fromSelector),to:row.querySelector(toSelector)})),field=fields[index],key=event.target===field.from?'from':event.target===field.to?'to':null;if(!key)return;
   rows.forEach(row=>row.querySelectorAll('input').forEach(input=>input.setCustomValidity('')));
   if(event.target.value==='')return;
   try{const linked=linkBoundary(fields.map(pair=>({from:Number(pair.from.value),to:Number(pair.to.value)})),index,key,Number(event.target.value));fields.forEach((pair,i)=>{pair.from.value=linked[i].from;pair.to.value=linked[i].to;});}
   catch(err){event.target.setCustomValidity(err.message);}
  };
 }
 const api={linkBoundary,bindRanges,number,editCell,moveShipment,periods,validatePeriods,applyPeriods};root.PipePlanning=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
