import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const widths=[320,360,375,390,414,430];
const long='long-server-or-provider-name-'.repeat(8);
const server={id:'fixture',hostname:long,ip:'192.0.2.1',os:'Linux',provider:long,status:'unknown',telemetryStatus:'missing',latestSampleAt:null,cpuPercent:null,memoryPercent:null,diskPercent:null,services:[{name:long,status:'failed'}]};
async function fits(page){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(()=>innerWidth));
  const outside=await page.locator('a,button,input,select,textarea,article,.glass-panel').evaluateAll(items=>items.filter(e=>{
    const r=e.getBoundingClientRect();return r.width&&r.height&&(r.left<0||r.right>innerWidth);
  }).map(e=>e.textContent?.slice(0,60)||e.tagName));
  expect(outside).toEqual([]);
  expect(await page.evaluate(()=>window.visualViewport.scale)).toBe(1);
}
for(const width of widths){
  test(`servers and enrollment fit ${width}px at normal zoom`,async({page})=>{
    await page.setViewportSize({width,height:640});
    await page.addInitScript(()=>{window.EventSource=class{addEventListener(){}close(){}};});
    const h=await mount(page,'web/app/servers/page.tsx',{responses:{'/api/servers':{success:true,servers:[server]},'/api/connections':{environments:[{id:'env',name:long,project_name:long}]}}});
    await expect(page.getByRole('heading',{name:long,exact:true})).toBeVisible();
    const nav=page.getByRole('navigation',{name:'Infrastructure navigation'});
    await expect(nav.locator('a')).toHaveCount(3);
    await expect(page.getByRole('navigation',{name:'Primary navigation'}).locator('a')).toHaveCount(5);
    for(const link of await nav.locator('a').all()){
      const box=await link.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await fits(page);
    await page.getByRole('button',{name:'+ Enroll New Server',exact:true}).click();
    const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
    await page.getByLabel('Environment',{exact:true}).selectOption('env');
    await page.getByLabel('Hostname',{exact:true}).fill(long.slice(0,253));
    await page.getByRole('button',{name:'Create project environment',exact:true}).click();
    await fits(page);
    const panel=dialog.locator(':scope > div');const box=await panel.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(16);expect(box.x+box.width).toBeLessThanOrEqual(width-16);
    expect(box.y).toBeGreaterThanOrEqual(16);expect(box.y+box.height).toBeLessThanOrEqual(624);
    await page.getByRole('button',{name:'Close server connection'}).click();h.verify();
  });
  for(const route of ['operations','notifications','tasks'])test(`${route} populated content fits ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:844});
    const h=await mount(page,`web/app/${route}/page.tsx`,{query:route==='tasks'?'?task=fixture':'',responses:{
      '/api/servers':{success:true,servers:[server]},
      '/api/servers/commands':{commands:[{id:'op',hostname:long,service:long,status:'pending',requested_by:'other',expires_at:'2099-01-01'}],services:[long],configured:true,userId:'fixture-user'},
      '/api/notifications':{preferences:[{id:'env',project_name:long,name:long,email:long+'@example.test',verified:true,security_enabled:true,deployment_enabled:true}],history:[{id:'mail',kind:'security',status:'accepted',source_id:long}]},
      '/api/tasks':{tasks:[{id:'fixture',status:'failed',user_prompt:long,result:null,pullRequest:null,workspace:null}]},
      '/api/github/repositories/connect':{repositories:[{id:'repo',full_name:long}]},
    }});
    await expect(page.getByRole('heading',{name:route==='operations'?'Server operation approvals':route==='notifications'?'Email notifications':'Autonomous Coding Prompt',exact:true})).toBeVisible();
    if(route==='tasks')await expect(page.getByText('Goal:',{exact:true})).toBeVisible();
    else await expect(page.locator('.workspace-card').first()).toBeVisible();
    await fits(page);h.verify();
  });
}
for(const route of ['servers','tasks'])for(const width of [1280,1440])test(`${route} desktop content remains pixel-identical at ${width}px`,async({browser})=>{
  mkdirSync('tmp/task7-baseline',{recursive:true});
  const path=`tmp/task7-baseline/${route}.tsx`;
  writeFileSync(path,execFileSync('git',['show',`HEAD:web/app/${route}/page.tsx`]));
  const before=await browser.newPage({viewport:{width,height:900}});
  const after=await browser.newPage({viewport:{width,height:900}});
  for(const page of [before,after])await page.addInitScript(()=>{window.EventSource=class{addEventListener(){}close(){}};});
  const first=await mount(before,path),second=await mount(after,`web/app/${route}/page.tsx`);
  for(const page of [before,after])await expect(page.getByRole('heading',{name:route==='servers'?'No servers enrolled yet':'Autonomous Coding Prompt',exact:true})).toBeVisible();
  const screenshotOptions={animations:'disabled',caret:'hide'};
  const content=route==='servers'?'.glass-panel':'form';
  expect((await after.locator(content).first().screenshot(screenshotOptions)).equals(await before.locator(content).first().screenshot(screenshotOptions))).toBe(true);
  first.verify();second.verify();await before.close();await after.close();
});
