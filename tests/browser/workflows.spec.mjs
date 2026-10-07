import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';

test('usage shows loading until the API response and then an empty state',async({page})=>{
 let release;
 const responseReady=new Promise(resolve=>{release=resolve;});
 const h=await mount(page,'web/app/usage/page.tsx',{responses:{'/api/chat/usage':async route=>{
  await responseReady;return route.fulfill({json:{attempts:[]}});
 }}});
 try {await expect(page.getByRole('status')).toHaveText(/Loading usage/);}
 finally {release();}
 await expect(page.getByText('No attempts recorded.')).toBeVisible();h.verify();
});

test('usage never invents absent tokens or cost',async({page})=>{
 const h=await mount(page,'web/app/usage/page.tsx',{responses:{'/api/chat/usage':{attempts:[{id:'fixture',channel:'embedding_query',provider:'fixture',model:'fixture',status:'started',created_at:'2026-10-05T00:00:00Z',usage:null}]}}});
 await expect(page.getByText(/Input tokens: Unknown/)).toBeVisible();await expect(page.getByText(/Configured-rate estimate:/)).toHaveCount(0);h.verify();
});
for(const [component,path] of [['usage','/api/chat/usage'],['releases','/api/releases'],['operations','/api/servers/commands'],['channels/gmail','/api/channels/gmail/replies']]){
 test(`${component}: denied API remains an error`,async({page})=>{
  const h=await mount(page,`web/app/${component}/page.tsx`,{responses:{[path]:{status:403,body:{error:'Access revoked fixture'}}}});
  await expect(page.getByRole('alert')).toHaveText('Access revoked fixture');h.verify();
 });
}
test('release requires an explicit click and sends the exact reviewed head',async({page})=>{
 const row={task_id:'task-fixture',target_id:'target-fixture',commit_sha:'a'.repeat(40),target_version:3,full_name:'fixture/repository',environment_name:'Test',provider_environment:'test',html_url:'https://example.test/pr/1'};
 const h=await mount(page,'web/app/releases/page.tsx',{responses:{'/api/releases':async(route,request)=>request.method()==='GET'?route.fulfill({json:{releases:[row]}}):route.fulfill({status:409,json:{error:'Reviewed head changed'}})}});
 const button=page.getByRole('button',{name:'Approve merge and start existing deployment pipeline'});await expect(button).toBeVisible();expect(h.requests.filter(r=>r.method==='POST')).toHaveLength(0);
 await button.click();await expect(page.getByRole('alert')).toHaveText('Reviewed head changed');
 expect(h.requests.find(r=>r.method==='POST').body).toEqual({action:'approve',taskId:row.task_id,targetId:row.target_id,headSha:row.commit_sha,targetVersion:3});h.verify();
});
test('restart links never execute; self approval and expired approval are disabled',async({page})=>{
 const h=await mount(page,'web/app/operations/page.tsx',{query:'?server=host&service=app.service',responses:{'/api/servers':{servers:[{id:'host',hostname:'Fixture host'}]},'/api/servers/commands':{configured:true,userId:'fixture-user',services:['app.service'],commands:[{id:'own',hostname:'Fixture host',service:'app.service',status:'pending',requested_by:'fixture-user',expires_at:'2099-01-01T00:00:00Z'},{id:'expired',hostname:'Fixture host',service:'app.service',status:'pending',requested_by:'other',expires_at:'2000-01-01T00:00:00Z'}]}}});
 await expect(page.getByLabel('Server')).toHaveValue('host');await expect(page.getByLabel('Service',{exact:true})).toHaveValue('app.service');
 await expect(page.getByRole('button',{name:'Approve this service restart'})).toBeDisabled();expect(h.requests.filter(r=>r.method==='POST')).toHaveLength(0);h.verify();
});
test('Gmail rejection sends only an explicit decision and preserves failure',async({page})=>{
 const h=await mount(page,'web/app/channels/gmail/page.tsx',{responses:{'/api/channels/gmail/replies':async(route,request)=>request.method()==='GET'?route.fulfill({json:[{id:'draft-fixture',recipient:'recipient@example.test',subject:'Fixture',body:'Review this exact text',status:'pending',expires_at:'2099-01-01'}]}):route.fulfill({status:409,json:{error:'Draft expired'}})}});
 await expect(page.getByText('Review this exact text')).toBeVisible();expect(h.requests.filter(r=>r.method==='POST')).toHaveLength(0);
 await page.getByRole('button',{name:'Reject',exact:true}).click();await expect(page.getByRole('alert')).toHaveText('Draft expired');
 expect(h.requests.find(r=>r.method==='POST').body).toEqual({action:'decide',id:'draft-fixture',approve:false});h.verify();
});
for(const component of ['tasks','chat','channels','servers','dashboard'])test(`${component}: empty fixture renders without external calls`,async({page})=>{
 const h=await mount(page,`web/app/${component}/page.tsx`);
 await expect(page.locator('#root')).not.toBeEmpty();await expect.poll(()=>h.requests.length).toBeGreaterThan(0);
 await page.waitForTimeout(250);h.verify();
});
test('connections fail visibly after permission revocation',async({page})=>{
 const h=await mount(page,'web/components/ConnectionsPanel.tsx',{responses:{'/api/connections':{status:403,body:{error:'Connection access revoked'}}}});
 await expect(page.getByRole('alert')).toHaveText('Connection access revoked');h.verify();
});
for(const width of [320,375,768])test(`usage is readable at ${width}px and keyboard navigable`,async({page})=>{
 await page.setViewportSize({width,height:900});const h=await mount(page,'web/app/usage/page.tsx');
 await expect(page.getByText('No attempts recorded.')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Ryvix home',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.getByRole('navigation',{name:'Workspace navigation'}).getByRole('link',{name:'Dashboard',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('summary').filter({hasText:'Workspace tools'})).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Chat',exact:true})).toBeFocused();h.verify();
});
