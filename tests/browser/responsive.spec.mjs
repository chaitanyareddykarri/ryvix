import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';
const routes=['','login','auth/reset-password','dashboard','tasks','chat','servers','deployments','observability','channels','channels/gmail','channels/alerts','channels/assistant','operations','recovery','releases','notifications','knowledge','experience','learning','learning/external','profile/whatsapp','usage'];
async function fits(page,width){
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 const clipped=await page.locator('a,button,input,textarea,select').evaluateAll(elements=>elements.filter(e=>{
  const r=e.getBoundingClientRect(),s=getComputedStyle(e);if(!r.width||!r.height||s.visibility==='hidden')return false;
  // Deliberate scroll regions (log tables, bottom navigation) remain usable.
  for(let p=e.parentElement;p;p=p.parentElement)if(['auto','scroll'].includes(getComputedStyle(p).overflowX)&&p.scrollWidth>p.clientWidth)return false;
  return r.left< -1||r.right>innerWidth+1;
 }).map(e=>e.textContent?.slice(0,60)||e.getAttribute('aria-label')));
 expect(clipped).toEqual([]);
}
for(const width of [320,375,390,768,1280])for(const route of routes)test(`${route||'landing'} fits ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});
 const h=await mount(page,`web/app/${route?route+'/':''}page.tsx`);
 await expect(page.locator('#root')).not.toBeEmpty();
 if(route==='dashboard')await page.waitForTimeout(1100);
 else await page.waitForTimeout(100);
 await fits(page,width);h.verify();
});
for(const width of [320,375,390])test(`populated task and mail fit ${width}px with honest evidence`,async({page})=>{
 await page.setViewportSize({width,height:844});
 const h=await mount(page,'web/app/tasks/page.tsx',{query:'?task=fixture',responses:{'/api/tasks':{tasks:[{id:'fixture',status:'completed',user_prompt:'Fixture task',result:null,pullRequest:null,workspace:null}]}}});
 await expect(page.getByText('Fixture task',{exact:false})).toBeVisible();
 await expect(page.getByText('PASSED (0 errors)')).toHaveCount(0);
 await expect(page.getByText('Task Completed & GitHub PR Opened!',{exact:false})).toHaveCount(0);
 await expect(page.getByRole('button',{name:/Approve, Commit/})).toBeDisabled();
 await fits(page,width);h.verify();
});
for(const width of [320,375,390])test(`long reply content fits ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});
 const h=await mount(page,'web/app/channels/gmail/page.tsx',{responses:{'/api/channels/inbox':{messages:[{id:'mail',channel:'gmail',sender:'long-customer-address@fixture.example.test',content:'Fixture '.repeat(15)}]},'/api/channels/gmail/replies':[{id:'reply',recipient:'long-customer-address@fixture.example.test',subject:'Fixture',body:'https://fixture.example.test/'+ 'long-path-'.repeat(12),status:'pending',expires_at:'2099-01-01T00:00:00Z'}]}});
 await expect(page.getByText('To:',{exact:false})).toBeVisible();await fits(page,width);h.verify();
});
test('empty dashboard does not claim live, sync or completed execution',async({page})=>{
 const h=await mount(page,'web/app/dashboard/page.tsx');await page.waitForTimeout(1100);
 await expect(page.getByText('GitHub Synced',{exact:true})).toHaveCount(0);
 await expect(page.getByText(/^.*LIVE$/)).toHaveCount(0);
 await expect(page.getByText('No task started',{exact:true})).toBeVisible();h.verify();
});
