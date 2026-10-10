import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const long='https://application.example/'+ 'long-unbroken-diagnostic-path'.repeat(12);
const logs=[{id:'log',timestamp:'2026-10-11T10:00:00Z',type:'SECURITY',severity:'critical',message:long,source:long}];
const responses={'/api/observability/logs':{success:true,logs},'/api/monitoring/probe':{success:false,error:long}};
async function pageFits(page,width){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  expect(await page.evaluate(()=>visualViewport.scale)).toBe(1);
  const outside=await page.locator('main header,main header p,main a,main input,main button,main > div').evaluateAll(elements=>elements.filter(e=>{
    const r=e.getBoundingClientRect();return r.width&&r.height&&(r.left<0||r.right>innerWidth);
  }).map(e=>e.textContent?.slice(0,80)||e.getAttribute('placeholder')));
  expect(outside).toEqual([]);
  const escaped=await page.locator('main > div').first().evaluate(card=>{
    const border=card.getBoundingClientRect();
    return [...card.querySelectorAll('h3,p,input,button')].filter(e=>{
      const r=e.getBoundingClientRect();return r.left<border.left+24||r.right>border.right-24;
    }).map(e=>e.textContent||e.tagName);
  });
  expect(escaped).toEqual([]);
}
for(const width of [320,360,375,390,414,430])test(`observability content stays inside containers at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});
  const h=await mount(page,'web/app/observability/page.tsx',{responses});
  const records=page.getByRole('region',{name:'Observability records'});
  await expect(records.getByText(long,{exact:true})).toHaveCount(2);
  await pageFits(page,width);
  for(const name of ['all','info','warning','critical','security']){
    await page.getByRole('button',{name,exact:true}).click();await pageFits(page,width);
  }
  await page.getByPlaceholder('https://your-application.example/health').fill(long);
  await page.getByRole('button',{name:'Execute Health Probe',exact:true}).click();
  await expect(page.locator('main > div').first()).toContainText(long);
  await pageFits(page,width);
  await page.getByPlaceholder('Filter logs by message or source...').fill('long-unbroken');
  await expect(records.getByText(long,{exact:true})).toHaveCount(2);
  await expect(records.getByText('Scroll horizontally to see all columns →')).toBeVisible();
  expect(await records.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);
  await records.focus();await page.keyboard.press('End');
  await records.evaluate(e=>{e.scrollLeft=e.scrollWidth;});
  await expect.poll(()=>records.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
  const right=await records.boundingBox();
  const source=await records.getByText(long,{exact:true}).last().boundingBox();
  expect(source.x).toBeGreaterThanOrEqual(right.x);expect(source.x+source.width).toBeLessThanOrEqual(right.x+right.width);
  const overflowingCells=await records.locator(':scope > div > div').evaluateAll(cells=>cells.filter(e=>e.scrollWidth>e.clientWidth).map(e=>e.textContent));
  expect(overflowingCells).toEqual([]);
  await pageFits(page,width);
  await records.evaluate(e=>{e.scrollLeft=0;});await expect(records.getByText('Time',{exact:true})).toBeVisible();
  h.verify();
});
for(const width of [1280,1440])test(`observability desktop content retains sizing and styles at ${width}px`,async({browser})=>{
  mkdirSync('tmp/task7-baseline',{recursive:true});
  const path='tmp/task7-baseline/observability.tsx';
  const baseline=execFileSync('git',['show','HEAD:web/app/observability/page.tsx'],{encoding:'utf8'});
  writeFileSync(path,baseline.replace('"./Observability.module.css"','"@/app/observability/Observability.module.css"'));
  const before=await browser.newPage({viewport:{width,height:900}}),after=await browser.newPage({viewport:{width,height:900}});
  const first=await mount(before,path,{responses}),second=await mount(after,'web/app/observability/page.tsx',{responses});
  for(const page of [before,after])await expect(page.getByText(long,{exact:true})).toHaveCount(2);
  const appearance=e=>[e,...e.querySelectorAll('*')].filter(node=>getComputedStyle(node).display!=='none').map(node=>{
    const s=getComputedStyle(node),r=node.getBoundingClientRect();
    return {width:r.width,height:r.height,...Object.fromEntries(['fontFamily','fontSize','fontWeight','color','backgroundColor','backgroundImage','borderRadius','padding','margin','gridTemplateColumns'].map(key=>[key,s[key]]))};
  });
  for(const index of [0,1,2])expect(await after.locator('main > div').nth(index).evaluate(appearance)).toEqual(await before.locator('main > div').nth(index).evaluate(appearance));
  first.verify();second.verify();await before.close();await after.close();
});
for(const width of [320,360,375,390,414,430])for(const state of ['loading','empty','error'])test(`observability ${state} message stays inside table at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});
  const h=await mount(page,'web/app/observability/page.tsx',{responses:{'/api/observability/logs':state==='loading'?async route=>{await new Promise(resolve=>setTimeout(resolve,1200));await route.fulfill({json:{success:true,logs:[]}});}:state==='error'?{status:503,body:{error:'Observability records unavailable. Please retry. '+long}}:{success:true,logs:[]}}});
  const region=page.getByRole('region',{name:'Observability records'});
  const message=state==='loading'?region.getByText('Loading recent observability records...'):state==='empty'?region.getByText('No log events recorded matching the current filter.'):region.getByRole('alert');
  await expect(message).toBeVisible();
  await region.evaluate(e=>{e.scrollLeft=e.scrollWidth;});
  const border=await region.boundingBox(),box=await message.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(border.x);expect(box.x+box.width).toBeLessThanOrEqual(border.x+border.width);
  await pageFits(page,width);
  h.verify();
});
