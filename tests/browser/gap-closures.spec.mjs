import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';
const id='11111111-1111-4111-8111-111111111111';
const team={currentRole:'owner',currentUserId:'self',organizationId:id,memberships:[{organization_id:id,name:'Fixture organization'}],invitations:[],members:[{id,user_id:'other',email:'person@example.test',full_name:'Other member',role:'developer'}]};
for(const width of [320,375,768,1280])for(const route of ['team','servers/tools','repositories'])test(`${route} renders at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:800});const h=await mount(page,`web/app/${route}/page.tsx`,{responses:{'/api/team':team}});
 await expect(page.getByRole('heading',{level:1})).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);h.verify();
});
test('team invite is explicit and does not request email by default',async({page})=>{
 const h=await mount(page,'web/app/team/page.tsx',{responses:{'/api/team':async(route,request)=>{
  if(request.method()==='GET')return route.fulfill({json:team});
  expect(request.postDataJSON()).toEqual({action:'invite',email:'new@example.test',role:'viewer',sendEmail:false});
  return route.fulfill({json:{token:'a'.repeat(64),delivery:'not_requested'}});
 }}});
 await page.getByLabel('Email',{exact:true}).fill('new@example.test');expect(h.requests.filter(r=>r.method==='POST')).toHaveLength(0);
 await page.getByRole('button',{name:'Create invitation'}).click();await expect(page.getByLabel('Invitation link (shown once)')).toHaveValue('http://ryvix.test/team#invite='+'a'.repeat(64));h.verify();
});
test('role changes and removal preserve confirmation and backend denial',async({page})=>{
 const h=await mount(page,'web/app/team/page.tsx',{responses:{'/api/team':async(route,request)=>{
  if(request.method()==='GET')return route.fulfill({json:team});
  expect(request.postDataJSON()).toEqual({action:'role',id,expectedRole:'developer',role:'viewer'});
  return route.fulfill({status:409,json:{error:'Member role changed; refresh before continuing.'}});
 }}});
 await page.getByLabel('Role for person@example.test').selectOption('viewer');
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Remove member'}).click();expect(h.requests.filter(r=>r.method==='POST')).toHaveLength(0);
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Save role'}).click();await expect(page.getByRole('alert')).toContainText('role changed');await expect(page.getByText('person@example.test · developer')).toBeVisible();h.verify();
});
test('invitation token stays out of requests until explicit acceptance',async({page})=>{
 const token='b'.repeat(64);const h=await mount(page,'web/app/team/page.tsx',{query:'#invite='+token,responses:{'/api/team':async(route,request)=>{
  if(request.method()==='GET')return route.fulfill({json:{...team,currentRole:'viewer',members:[]}});
  expect(request.postDataJSON()).toEqual({action:'accept',token});return route.fulfill({status:403,json:{error:'Invitation expired or revoked.'}});
 }}});
 await expect(page.getByLabel('Invitation token')).toHaveValue(token);expect(new URL(page.url()).hash).toBe('');expect(h.requests.filter(r=>r.method==='POST')).toHaveLength(0);
 await page.getByRole('button',{name:'Accept invitation',exact:true}).click();await expect(page.getByRole('alert')).toHaveText('Invitation expired or revoked.');h.verify();
});
test('server tools require explicit actions and display recorded classification',async({page})=>{
 const h=await mount(page,'web/app/servers/tools/page.tsx',{responses:{'/api/servers':{servers:[{id,hostname:'fixture-db'}]},'/api/servers/tools':async(route,request)=>{
  const body=request.postDataJSON();
  if(body.action==='diagnose'){expect(body.errorOutput).toBe('permission denied');return route.fulfill({json:{diagnosis:{diagnosticMessage:'SSH authentication rejected.',recommendedUserAction:'Review the approved public key.'}}});}
  expect(body).toEqual({action:'classify',serverId:id});return route.fulfill({json:{features:{displayName:'Database host',detectedModules:['postgresql'],diagnosticCommands:['inspect service']},source:'Recorded inventory; heuristic recommendation',lastHeartbeat:null,services:[{name:'postgresql'}]}});
 }}});
 await page.getByLabel('Error text').fill('permission denied');expect(h.requests.filter(r=>r.method==='POST')).toHaveLength(0);await page.getByRole('button',{name:'Explain error'}).click();await expect(page.getByText('SSH authentication rejected.')).toBeVisible();
 await page.getByRole('combobox',{name:/^Server/}).selectOption(id);await page.getByRole('button',{name:'Inspect recorded inventory'}).click();await expect(page.getByText('Database host',{exact:true})).toBeVisible();await expect(page.getByText('Last heartbeat: Unknown')).toBeVisible();h.verify();
});
test('private key is downloaded explicitly and can be cleared',async({page})=>{
 const h=await mount(page,'web/app/servers/tools/page.tsx',{responses:{'/api/servers/tools':{publicKey:'ssh-ed25519 fixture',privateKey:'fixture-not-a-real-key'}}});
 await page.getByRole('button',{name:'Generate keypair'}).click();await expect(page.getByLabel('Public key')).toHaveValue('ssh-ed25519 fixture');
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download private key'}).click();const download=await pending;expect(download.suggestedFilename()).toBe('ryvix_ed25519');
 await page.getByRole('button',{name:'Clear keys from this page'}).click();await expect(page.getByLabel('Public key')).toHaveCount(0);h.verify();
});
test('repository inspection displays actual response only after explicit request',async({page})=>{
 const h=await mount(page,'web/app/repositories/page.tsx',{responses:{'/api/github/repositories/connect':{repositories:[{id:'repo',full_name:'fixture/project',default_branch:'main'}]},'/api/github/repositories/analyze':{success:true,analysis:{displayName:'Fixture stack',language:'TypeScript',framework:'Next.js',packageManager:'npm',filesCount:12,buildCommand:'npm run build',testCommand:'npm test',devCommand:'npm run dev',deployment:{summary:'Fixture workflow',workflowFile:'.github/workflows/ci.yml'},security:{hasPotentialSecrets:false}}}}});
 await page.getByRole('combobox',{name:/Repository/}).selectOption('repo');expect(h.requests.some(r=>r.path==='/api/github/repositories/analyze')).toBe(false);await page.getByRole('button',{name:'Inspect repository',exact:true}).click();await expect(page.getByText('Fixture stack',{exact:true})).toBeVisible();await expect(page.getByText('npm test',{exact:true})).toBeVisible();h.verify();
});
