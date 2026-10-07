import {build} from 'esbuild';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect} from '@playwright/test';
const bundles=new Map();
const root=resolve('.');
const css=readFileSync('web/app/globals.css','utf8').replace(/^@import.*;\s*$/gm,'');
const defaults={
 '/api/github/repositories/live-url':{liveUrl:null},
 '/api/profile/contact':{phoneNumber:'+15555550123'},
 '/api/team':{members:[],invitations:[],memberships:[],currentRole:'viewer',currentUserId:'fixture-user'},
 '/api/servers/recovery':{requests:[],userId:'fixture-user'},
 '/api/notifications':{preferences:[],history:[]},'/api/knowledge':{repositories:[]},
 '/api/channels/alerts':{alerts:[]},'/api/channels/assistant':{sessions:[],messages:[],deliveries:[],proposals:[]},
 '/api/profile/phone':{connections:[]},'/api/learning':{projects:[],labels:[],userId:'fixture-user'},
 '/api/experience':{responseStats:[],projects:[],memories:[],examples:[],lessons:[],settings:[]},
 '/api/observability/logs':{success:true,logs:[]},'/api/deployments/runtime':{targets:[]},
 '/api/chat/usage':{attempts:[]},'/api/releases':{releases:[]},'/api/tasks':{tasks:[]},
 '/api/github/repositories/connect':{repositories:[]},'/api/github/repositories':{connected:false,repositories:[]},
 '/api/servers':{success:true,servers:[]},'/api/servers/commands':{commands:[],services:[],configured:false,userId:'fixture-user'},
 '/api/channels/inbox':{messages:[]},'/api/channels/gmail/replies':[],
 '/api/chat/conversations':{conversations:[],repositories:[]},
 '/api/connections':{connections:[],environments:[]},'/api/workspace':{sessions:[]},
 '/api/settings':{organization:{name:'Fixture workspace'},profile:{}},
 '/api/dashboard':{incidents:[],securityEvents:[],healthChecks:[],auditEvents:[]},
};
async function bundle(component){
 if(bundles.has(component))return bundles.get(component);
 const shell=/^web\/app\/(releases|operations|recovery|notifications|knowledge|experience|learning|profile|usage|deployments|team|repositories|servers\/tools)\//.test(component);
 const contents=`import React from 'react';import {createRoot} from 'react-dom/client';import Page from './${component}';import Shell from './web/components/WorkspaceShell';${component==='web/app/page.tsx'?"Page().then(element=>createRoot(document.getElementById('root')).render(element));":`createRoot(document.getElementById('root')).render(${shell?'React.createElement(Shell,null,React.createElement(Page))':'React.createElement(Page)'});`}`;
 const result=await build({stdin:{contents,resolveDir:root,loader:'tsx'},bundle:true,write:false,outfile:resolve(root,'tmp/browser/component.js'),format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'},plugins:[{name:'test-only-boundaries',setup(b){
  b.onResolve({filter:/^next\/(link|navigation|headers)$|^@\/utils\/supabase\/(client|server)$/},a=>({path:a.path,namespace:'fixture'}));
  b.onResolve({filter:/^@\//},a=>({path:['','.tsx','.ts','/index.tsx','/index.ts'].map(ext=>resolve(root,'web',a.path.slice(2)+ext)).find(path=>existsSync(path))}));
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({resolveDir:root,loader:'js',contents:a.path==='next/headers'?`export const cookies=async()=>({getAll:()=>[]});`:a.path==='@/utils/supabase/server'?`export const createClient=()=>({auth:{getUser:async()=>({data:{user:window.__serverUser||null}})}});`:a.path==='next/link'?`import React from 'react';export default function Link({children,prefetch,...props}){return React.createElement('a',props,children);}`:a.path==='next/navigation'?`export const useRouter=()=>({push:p=>location.assign(p),replace:p=>location.replace(p)});export const useSearchParams=()=>new URLSearchParams(location.search);`:
   `const channel={on(){return this},subscribe(){return this}};export const createClient=()=>({auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithOAuth:async(options)=>{(window.__oauthCalls??=[]).push(options);return window.__oauthResult??{data:{url:null},error:{message:"Fixture unavailable"}};},signInWithPassword:async(options)=>{(window.__passwordCalls??=[]).push(options);return {data:{session:null},error:{message:"Invalid login credentials"}};},getUser:async()=>({data:{user:{id:'fixture-user',email:'fixture@example.test',user_metadata:{}}}}),signOut:async()=>({})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null})})})}),channel:()=>channel,removeChannel:()=>{}});`}));
 }}]});
 const output={js:result.outputFiles.find(f=>f.path.endsWith('.js')).text,css:result.outputFiles.find(f=>f.path.endsWith('.css'))?.text||''};bundles.set(component,output);return output;
}
// Actual components, isolated framework/auth responses. This never starts the app
// or bypasses its middleware. Unknown requests fail instead of reaching a provider.
export async function mount(page,component,{responses={},query='',delay=0}={}){
 const output=await bundle(component),unexpected=[],errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.context().route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!=='http://ryvix.test'){unexpected.push(url.origin);return route.abort();}
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}\n${output.css}</style></head><body><div id="root"></div><script src="/component.js"></script></body></html>`});
  if(url.pathname==='/component.js')return route.fulfill({contentType:'application/javascript',body:output.js});
  requests.push({path:url.pathname,method:request.method(),body:request.postDataJSON()});
  if(delay)await new Promise(r=>setTimeout(r,delay));
  if(url.pathname==='/api/telemetry/stream')return route.fulfill({contentType:'text/event-stream',body:'event: unavailable\ndata: {}\n\n'});
  const value=responses[url.pathname];
  if(typeof value==='function')return value(route,request);
  if(value)return route.fulfill({status:value.status||200,json:value.body??value});
  if(request.method()==='GET'&&url.pathname in defaults)return route.fulfill({json:defaults[url.pathname]});
  unexpected.push(`${request.method()} ${url.pathname}`);return route.abort();
 });
 await page.context().routeWebSocket('**/*',ws=>{unexpected.push('WebSocket');ws.close();});
 await page.goto('http://ryvix.test/'+query);
 return {requests,verify:()=>{expect(unexpected).toEqual([]);expect(errors).toEqual([]);}};
}
