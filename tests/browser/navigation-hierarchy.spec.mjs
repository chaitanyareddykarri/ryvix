import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';
import {mkdirSync} from 'node:fs';
const sections=['/servers','/observability','/tasks','/server-approvals','/notifications'];
const routes=[...sections,'/dashboard','/operations','/recovery'];
async function fits(page){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(()=>innerWidth));
  const escaped=await page.locator('header a,nav a,main input,main select,main button,.workspace-card').evaluateAll(items=>items.filter(e=>{
    const r=e.getBoundingClientRect();return r.width&&r.height&&(r.left<0||r.right>innerWidth);
  }).map(e=>e.textContent||e.tagName));
  expect(escaped).toEqual([]);
}
for(const width of [320,360,375,390,414,430,768,1280])for(const route of routes)test(`${route} navigation hierarchy fits ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  const h=await mount(page,`web/app${route}/page.tsx`);
  if(route==='/dashboard')await page.waitForTimeout(1100);
  const primary=page.getByRole('navigation',{name:'Primary navigation'});
  if(['/operations','/recovery'].includes(route)){
    await expect(primary).toHaveCount(0);
    await expect(page.locator('a[href="/dashboard"]')).toHaveCount(0);
    await expect(page.getByRole('link',{name:'← Back to Server Approvals',exact:true})).toHaveAttribute('href','/server-approvals');
    await expect(page.getByRole('heading',{name:route==='/operations'?'Server operation approvals':'Cloud recovery approvals',exact:true})).toBeVisible();
  }else{
    await expect(primary).toBeVisible();
    expect(await primary.locator('a').evaluateAll(items=>items.map(e=>e.getAttribute('href')))).toEqual(sections);
    const active=primary.locator('a[aria-current]');
    if(route==='/dashboard')await expect(active).toHaveCount(0);
    else {await expect(active).toHaveCount(1);await expect(active).toHaveAttribute('href',route);}
    await expect(primary.locator('a[href="/dashboard"],a[href="/recovery"],a[href="/operations"]')).toHaveCount(0);
    const home=page.getByRole('link',{name:'↩ Return to Dashboard',exact:true});
    await expect(home).toHaveAttribute('href','/');
    await expect(home).not.toHaveAttribute('aria-current',/.+/);
    expect(await home.evaluate(e=>new URL(e.href).pathname)).toBe('/');
    await expect(primary.locator('a[href="/"]')).toHaveCount(0);
    await expect(page.locator('a[href="/dashboard"][aria-current]')).toHaveCount(0);
    if(route==='/server-approvals')for(const child of ['/operations','/recovery'])await expect(page.locator(`main a[href="${child}"]`)).toBeVisible();
  }
  await fits(page);
  if(width===320&&['/observability','/server-approvals','/recovery'].includes(route)){
    mkdirSync('tmp/render-audit',{recursive:true});await page.screenshot({path:`tmp/render-audit/navigation-${route.slice(1)}-320.png`,fullPage:true});
  }
  h.verify();
});
test('root retains introduction sections and the console stays a separate route',async({page})=>{
  const h=await mount(page,'web/app/page.tsx');
  await expect(page.locator('a[href="#architecture"]')).toHaveText('Architecture');
  await expect(page.locator('a[href="#metrics"]')).toHaveText('Fleet & SRE');
  await expect(page.locator('#architecture')).toHaveCount(1);
  await expect(page.locator('#metrics')).toHaveCount(1);
  h.verify();
});
for(const width of [320,360,375,390,414,430,1280])for(const route of ['servers/tools','servers/demo'])test(`${route} returns to its parent at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  const h=await mount(page,`web/app/${route}/page.tsx`);
  await expect(page.getByRole('link',{name:'← Back to Servers',exact:true})).toHaveAttribute('href','/servers');
  await expect(page.getByRole('navigation',{name:'Primary navigation'})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'↩ Return to Dashboard',exact:true})).toHaveCount(0);
  await fits(page);h.verify();
});
for(const route of ['/operations','/recovery','/servers/tools'])test(`${route} resolves to its main section`,async({page})=>{
  const h=await mount(page,'web/components/ApplicationNavigation.tsx',{pathname:route});
  const active=page.getByRole('navigation',{name:'Primary navigation'}).locator('a[aria-current]');
  await expect(active).toHaveCount(1);await expect(active).toHaveAttribute('href',route==='/servers/tools'?'/servers':'/server-approvals');h.verify();
});
