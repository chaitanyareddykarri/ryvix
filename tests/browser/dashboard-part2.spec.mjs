import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';
test('Preview Studio without a task shows an empty state and never mounts an empty iframe',async({page})=>{
 const h=await mount(page,'web/app/dashboard/page.tsx',{responses:{
  '/api/github/repositories/connect':{repositories:[{id:'11111111-1111-4111-8111-111111111111',full_name:'fixture/site',default_branch:'main'}]}
 }});
 await page.getByRole('button',{name:/Open Preview Studio/}).first().click();
 await expect(page.getByRole('heading',{name:'No AI Preview Available'}).first()).toBeVisible();
 await expect(page.locator('iframe[title^="Sandboxed Preview"]')).toHaveCount(0);
 await expect(page.locator('iframe[src=""]')).toHaveCount(0);
 h.verify();
});
test('PR approval shows recorded evidence and submits only the selected task',async({page})=>{
 const id='11111111-1111-4111-8111-111111111111';
 const task={id,status:'awaiting_approval',user_prompt:'Review fixture changes',created_at:'2026-10-07T00:00:00Z',result:{files:[{path:'app.ts',additions:1,deletions:0}]}};
 const h=await mount(page,'web/app/dashboard/page.tsx',{responses:{
  '/api/tasks':{tasks:[task]},
  [`/api/tasks/${id}/ship`]:{task:{status:'completed'},pullRequest:{url:'https://example.test/pr/1',number:1}}
 }});
 await page.getByRole('button',{name:'Previews',exact:true}).click();
 await expect(page.getByText('1 files recorded',{exact:true})).toBeVisible();
 await expect(page.getByText('Commit: Not recorded',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Create Pull Request',exact:false}).click();
 await expect(page.getByRole('heading',{name:'Create a pull request?'})).toBeVisible();
 await expect(page.getByText('Build and regression checks depend on the repository\'s configured CI.',{exact:true})).toBeVisible();
 await expect(page.getByText(/4 files will be updated|Instant edge deployment|zero downtime/)).toHaveCount(0);
 expect(h.requests.some(r=>r.method==='POST')).toBe(false);
 await page.getByRole('button',{name:'Create Pull Request',exact:true}).click();
 await expect.poll(()=>h.requests.filter(r=>r.method==='POST').length).toBe(1);
 h.verify();
});
test('dashboard restores saved conversation and offers evidence chat',async({page})=>{
 const id='11111111-1111-4111-8111-111111111111';
 const h=await mount(page,'web/app/dashboard/page.tsx',{responses:{'/api/chat/conversations':async(route,request)=>route.fulfill({json:request.url().includes('?id=')?{conversationId:id,turns:[{question:'Saved incident question',answer:'Saved measured answer'}]}:{conversations:[{id}],repositories:[]}})}});
 await page.getByRole('button',{name:'AI Assistant',exact:true}).click();
 await expect(page.getByText('Saved incident question',{exact:true})).toBeVisible();
 await expect(page.getByText('Saved measured answer',{exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'View and switch saved conversations'})).toHaveAttribute('href','/chat');
 await page.getByRole('button',{name:'Security',exact:true}).click();
 await expect(page.getByRole('button',{name:'Inspect evidence in chat'})).toBeVisible();
 expect(h.requests.some(r=>r.method==='POST')).toBe(false);h.verify();
});
test('website URL waits for server confirmation and reloads across mounts',async({page})=>{
 const id='11111111-1111-4111-8111-111111111111';let saved=null,deny=true;
 const responses={
  '/api/github/repositories/connect':{repositories:[{id,full_name:'fixture/site',default_branch:'main'}]},
  '/fixture-live':{},
  '/api/github/repositories/live-url':async(route,request)=>{
   if(request.method()==='POST'){
    expect(request.postDataJSON().repositoryId).toBe(id);
    if(deny)return route.fulfill({status:403,json:{error:'Operator permission required.'}});
    saved=request.postDataJSON().liveUrl;
   }return route.fulfill({json:{liveUrl:saved}});
  }
 };
 const h=await mount(page,'web/app/dashboard/page.tsx',{responses});
 await page.getByRole('button',{name:'Previews',exact:true}).click();
 const input=page.getByPlaceholder('e.g. https://myecommerce.com');
 await input.fill('http://ryvix.test/fixture-live');await page.getByRole('button',{name:'Save URL',exact:true}).click();
 await expect(page.getByText('Operator permission required.',{exact:true})).toBeVisible();expect(saved).toBe(null);
 deny=false;await page.getByRole('button',{name:'Save URL',exact:true}).click();
 await expect.poll(()=>saved).toBe('http://ryvix.test/fixture-live');h.verify();
 await mount(page,'web/app/dashboard/page.tsx',{responses});
 await page.getByRole('button',{name:'Previews',exact:true}).click();
 await expect(page.getByPlaceholder('e.g. https://myecommerce.com')).toHaveValue(saved);
});
