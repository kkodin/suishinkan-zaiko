/* Microsoft MSAL Browser manages the authentication cache and renewal. */
(function(root){
 'use strict';
 const scopes=['https://graph.microsoft.com/Files.ReadWrite.All'];
 let client=null,account=null,configKey='',initializing=null,cacheKey='';
 function storeAccount(){try{localStorage.setItem(cacheKey,account.homeAccountId);}catch{}}
 function profile(){if(!account)return null;return {name:String(account.name||account.idTokenClaims?.name||account.username||'名前未取得'),username:String(account.username||account.idTokenClaims?.preferred_username||'')};}
 async function initialize(config){
  const key=config.tenant.toLowerCase()+'/'+config.client.toLowerCase();
  if(configKey===key&&client){if(initializing)await initializing;}
  else{
   if(!root.msal?.PublicClientApplication)throw Error('Microsoft認証ライブラリを読み込めません。画面を更新してください。');
   configKey=key;cacheKey='hashix.pipe.account.'+key;account=null;
   client=new root.msal.PublicClientApplication({auth:{clientId:config.client,authority:'https://login.microsoftonline.com/'+config.tenant,redirectUri:location.origin+location.pathname,navigateToLoginRequestUrl:false},cache:{cacheLocation:'localStorage'},system:{loggerOptions:{piiLoggingEnabled:false,loggerCallback:()=>{}}}});
   initializing=client.initialize();await initializing;initializing=null;
  }
  const all=client.getAllAccounts().filter(a=>a.tenantId?.toLowerCase()===config.tenant.toLowerCase()||a.idTokenClaims?.tid?.toLowerCase()===config.tenant.toLowerCase());
  let remembered='';try{remembered=localStorage.getItem(cacheKey)||'';}catch{}
  account=all.find(a=>a.homeAccountId===remembered)||(all.length===1?all[0]:null);if(account)client.setActiveAccount(account);
 }
 async function connect(config,options={}){
  await initialize(config);let response;
  if(account&&!options.selectAccount){try{response=await client.acquireTokenSilent({scopes,account});}catch(err){if(options.silent)throw Error('Microsoftへの再ログインが必要です。「OneDrive共有」から接続してください。');}}
  if(!response){if(options.silent)throw Error('保存済みのログインがありません。「OneDrive共有」から一度接続してください。');response=await client.acquireTokenPopup({scopes,prompt:options.selectAccount||!account?'select_account':undefined,account:options.selectAccount?undefined:account||undefined});}
  account=response.account;if(!account)throw Error('ログインしたアカウントを確認できませんでした。');client.setActiveAccount(account);storeAccount();return profile();
 }
 async function getToken(forceRefresh=false){if(!client||!account)throw Error('Microsoftへの接続が必要です。');try{const response=await client.acquireTokenSilent({scopes,account,forceRefresh});if(response.account){account=response.account;client.setActiveAccount(account);}return response;}catch{throw Error('Microsoftへの再ログインが必要です。「OneDrive共有」から接続してください。');}}
 function disconnect(){account=null;}
 root.PipeAuth={connect,getToken,user:profile,disconnect};
})(window);
