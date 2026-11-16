(function(){
 'use strict';
 for(const dialog of document.querySelectorAll('dialog')){
  const form=dialog.querySelector(':scope > form'),root=form||dialog,head=root.querySelector(':scope > .dialogHead');if(!head)continue;
  const actions=document.createElement('div');actions.className='dialogHeadActions';
  for(const bar of dialog.querySelectorAll('.dialogActions')){for(const button of [...bar.children]){const owner=button.closest('form');if(owner){if(!owner.id)owner.id=dialog.id+'Form';if(button.tagName==='BUTTON')button.setAttribute('form',owner.id);}else if(button.tagName==='BUTTON')button.type='button';actions.append(button);}bar.remove();}
  if(actions.children.length)head.append(actions);
  const body=document.createElement('div');body.className='dialogBody';for(const child of [...root.childNodes])if(child!==head)body.append(child);root.append(body);dialog.classList.add('managedDialog');head.classList.add('dialogHandle');
  let drag=null,dirty=false;dialog.addEventListener('input',()=>{dirty=true;});dialog.addEventListener('close',()=>{dirty=false;});dialog.addEventListener('cancel',e=>{e.preventDefault();if(!dirty||confirm('編集内容を保存せず閉じますか？'))dialog.close();});
  head.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,input,select,a,textarea'))return;const r=dialog.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:r.left,top:r.top};dialog.style.margin='0';dialog.style.left=r.left+'px';dialog.style.top=r.top+'px';head.setPointerCapture(e.pointerId);e.preventDefault();});
  head.addEventListener('pointermove',e=>{if(!drag)return;dialog.style.left=Math.max(-dialog.offsetWidth+100,Math.min(innerWidth-100,drag.left+e.clientX-drag.x))+'px';dialog.style.top=Math.max(0,Math.min(innerHeight-44,drag.top+e.clientY-drag.y))+'px';});
  const stop=()=>{drag=null;};head.addEventListener('pointerup',stop);head.addEventListener('pointercancel',stop);head.addEventListener('lostpointercapture',stop);
 }
})();
