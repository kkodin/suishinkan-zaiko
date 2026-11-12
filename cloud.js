/* Microsoft Graph: immutable change records. No tokens are persisted. */
(function(root){
 'use strict';
 let token='',expires=0,folder=null;
 const base='https://graph.microsoft.com/v1.0';
 const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const guid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 function validConfig(c){if(!guid.test(c.tenant)||!guid.test(c.client))throw Error('テナントIDとクライアントIDをGUID形式で入力してください。');const u=new URL(c.link);if(u.protocol!=='https:'||!u.hostname.endsWith('.sharepoint.com'))throw Error('会社用SharePoint／OneDriveのHTTPS共有リンクを指定してください。');if(!/^https?:$/.test(location.protocol))throw Error('共有接続はHTTPSのアプリURL、またはlocalhostから起動してください。');}
 async function request(path,opts={}){if(!token||Date.now()>=expires)throw Error('Microsoftへの再接続が必要です。共有ボタンからログインしてください。');const response=await fetch(base+path,{...opts,headers:{Authorization:'Bearer '+token,...opts.headers}});if(!response.ok){let msg='';try{msg=(await response.json()).error?.message||'';}catch{}throw Error('Microsoft '+response.status+'：'+msg);}if(response.status===204)return null;return response.json();}
 async function connect(config){
  validConfig(config);const state=b64(crypto.getRandomValues(new Uint8Array(24))),verifier=b64(crypto.getRandomValues(new Uint8Array(48)));
  const popup=window.open('about:blank','pipe-microsoft-login','width=600,height=720');if(!popup)throw Error('ログイン画面が開けませんでした。ポップアップを許可してください。');
  const challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  const redirect=location.origin+location.pathname,scope='https://graph.microsoft.com/Files.ReadWrite.All';
  const params=new URLSearchParams({client_id:config.client,response_type:'code',redirect_uri:redirect,response_mode:'query',scope,state,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'});
  const codePromise=new Promise((resolve,reject)=>{let timer,timeout;const clean=()=>{removeEventListener('message',listener);clearInterval(timer);clearTimeout(timeout);};function listener(event){if(event.origin!==location.origin||event.source!==popup||event.data?.pipeAuth!==state)return;clean();popup.close();event.data.error?reject(Error(event.data.error)):resolve(event.data.code);}addEventListener('message',listener);timer=setInterval(()=>{if(popup.closed){clean();reject(Error('ログインが中止されました。'));}},500);timeout=setTimeout(()=>{clean();popup.close();reject(Error('ログインの待機時間を超えました。'));},300000);});
  popup.location.href='https://login.microsoftonline.com/'+config.tenant+'/oauth2/v2.0/authorize?'+params;
  const code=await codePromise;const res=await fetch('https://login.microsoftonline.com/'+config.tenant+'/oauth2/v2.0/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.client,grant_type:'authorization_code',code,redirect_uri:redirect,code_verifier:verifier,scope})});
  const auth=await res.json();if(!res.ok)throw Error(auth.error_description||'ログインに失敗しました');token=auth.access_token;expires=Date.now()+(auth.expires_in-90)*1000;
  const shared=await request('/shares/u!'+b64(new TextEncoder().encode(config.link))+'/driveItem');const item=shared.remoteItem||shared;folder={drive:item.parentReference.driveId,id:item.id};if(!item.folder)throw Error('ファイルではなく共有フォルダのリンクを指定してください。');return folder;
 }
 async function list(){if(!folder)throw Error('共有フォルダに未接続です');let path='/drives/'+encodeURIComponent(folder.drive)+'/items/'+encodeURIComponent(folder.id)+'/children?$top=200&$select=id,name',files=[];while(path){const page=await request(path);files.push(...page.value.filter(f=>/^pipe-event-[0-9a-f-]+\.json$/i.test(f.name)));path=page['@odata.nextLink']?page['@odata.nextLink'].slice(base.length):null;}if(files.length>10000)throw Error('履歴が1万件を超えました。履歴の整理が必要です。');const events=[];for(let i=0;i<files.length;i+=8){const group=await Promise.all(files.slice(i,i+8).map(async f=>{const meta=await request('/drives/'+encodeURIComponent(folder.drive)+'/items/'+encodeURIComponent(f.id)+'?$select=id,@microsoft.graph.downloadUrl');const r=await fetch(meta['@microsoft.graph.downloadUrl'],{cache:'no-store'});if(!r.ok)throw Error('履歴読込に失敗しました');return r.json();}));events.push(...group);}return events;}
 async function append(event){if(!folder)throw Error('共有フォルダに未接続です');return request('/drives/'+encodeURIComponent(folder.drive)+'/items/'+encodeURIComponent(folder.id)+':/pipe-event-'+event.id+'.json:/content?@microsoft.graph.conflictBehavior=fail',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(event)});}
 function disconnect(){token='';expires=0;folder=null;}
 root.PipeCloud={connect,list,append,disconnect,connected:()=>!!folder&&!!token};
})(window);
