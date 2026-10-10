import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';
const server={id:'11111111-1111-4111-8111-111111111111',hostname:'fixture-app',ip:'192.0.2.10',os:'Linux',provider:'fixture',status:'unknown',telemetryStatus:'missing',latestSampleAt:null,cpuPercent:null,memoryPercent:null,diskPercent:null,lastHeartbeat:null,services:[{name:'nginx.service',status:'failed'}]};
test('phone dialog uses dashboard controls and fits a phone',async({page})=>{
 await page.setViewportSize({width:375,height:812});const h=await mount(page,'web/app/dashboard/page.tsx',{responses:{'/api/profile/contact':{phoneNumber:null}}});
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 await expect(dialog).toHaveCSS('background-color','rgb(13, 18, 24)');
 await expect(page.getByLabel('Your phone number for Telegram, with country code')).toHaveCSS('background-color','rgb(8, 12, 17)');
 await page.screenshot({path:'tmp/render-audit/phone-ui-mobile.png'});h.verify();
});
test('profile uses consistent panels at desktop width',async({page})=>{
 await page.setViewportSize({width:1280,height:900});const h=await mount(page,'web/app/profile/whatsapp/page.tsx');
 await expect(page.getByRole('heading',{name:'Phone / Telegram',exact:true})).toBeVisible();
 await page.screenshot({path:'tmp/render-audit/phone-ui-desktop.png'});h.verify();
});
test('home fleet navigation and server approval links are real destinations',async({page})=>{
 await page.addInitScript(()=>{window.__serverUser={id:'fixture-user',email:'fixture@example.test'};});
 const home=await mount(page,'web/app/page.tsx');await expect(page.getByRole('link',{name:'Manage Server Fleet',exact:true})).toHaveAttribute('href','/servers');home.verify();
});
test('fleet handles unavailable stream, recovery, filters and approval handoffs',async({page})=>{
 await page.addInitScript(()=>{window.EventSource=class{constructor(){this.handlers={};window.__fleetStream=this;}addEventListener(name,callback){this.handlers[name]=callback;}close(){} emit(name,data){this.handlers[name]?.({data:JSON.stringify(data)});}};});
 await page.setViewportSize({width:375,height:850});const h=await mount(page,'web/app/servers/page.tsx',{responses:{'/api/servers':{success:true,servers:[server]}}});
 await expect(page.getByRole('link',{name:'↩ Return to Dashboard',exact:true})).toHaveAttribute('href','/');
 await expect(page.getByRole('button',{name:'unknown (1)',exact:true})).toBeVisible();
 await expect(page.getByText('Not available',{exact:true})).toHaveCount(3);
 await expect(page.getByRole('link',{name:'Request restart',exact:true})).toHaveAttribute('href',`/operations?server=${server.id}&service=nginx.service`);
 await expect(page.getByRole('link',{name:'Reboot approval',exact:true})).toHaveAttribute('href',`/recovery?server=${server.id}`);
 await page.evaluate(()=>window.__fleetStream.emit('unavailable',{}));await expect(page.getByText('No servers enrolled yet')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Retry server list'})).toBeVisible();
 await page.evaluate(s=>window.__fleetStream.emit('telemetry',{success:true,servers:[s]}),server);
 await expect(page.getByRole('button',{name:'Retry server list'})).toHaveCount(0);
 await page.getByRole('button',{name:'healthy (0)',exact:true}).click();await expect(page.getByText('No servers match this filter.')).toBeVisible();
 await page.getByRole('button',{name:'all (1)',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(376);
 await page.screenshot({path:'tmp/render-audit/fleet-ui-mobile.png'});h.verify();
});
test('empty fleet explains enrollment prerequisites and request denial stays visible',async({page})=>{
 await page.addInitScript(()=>{window.EventSource=class{constructor(){this.handlers={};window.__fleetStream=this;}addEventListener(name,callback){this.handlers[name]=callback;}close(){} emit(name,data){this.handlers[name]?.({data:JSON.stringify(data)});}};});
 let denied=false;const h=await mount(page,'web/app/servers/page.tsx',{responses:{'/api/servers':async route=>route.fulfill({status:denied?403:200,json:denied?{error:'Workspace access revoked.'}:{success:true,servers:[]}})}});
 await expect(page.getByText('No servers enrolled yet',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'+ Enroll New Server',exact:true}).click();
 await expect(page.getByText(/No environments are available in this workspace/)).toBeVisible();await expect(page.getByRole('button',{name:'Generate enrollment',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Close server connection',exact:true}).click();
 denied=true;await page.evaluate(()=>window.__fleetStream.emit('unavailable',{}));await page.getByRole('button',{name:'Retry server list'}).click();
 await expect(page.getByRole('alert')).toContainText('Workspace access revoked.');await expect(page.getByText('No servers enrolled yet',{exact:true})).toHaveCount(0);h.verify();
});
for(const width of [320,1280])test(`server-only setup is explicit and selects the saved environment at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});let allow=false;
 const id='11111111-1111-4111-8111-111111111111';
 const h=await mount(page,'web/app/servers/page.tsx',{responses:{'/api/environments':async(route,request)=>{
  expect(request.postDataJSON()).toEqual({projectName:'My infrastructure',environmentName:'Development',isProduction:false});
  return route.fulfill({status:allow?200:403,json:allow?{environment:{id,name:'Development',project_name:'My infrastructure'}}:{error:'Operator permission required.'}});
 }}});
 await page.getByRole('button',{name:'+ Enroll New Server',exact:true}).click();await page.getByRole('button',{name:'Create project environment',exact:true}).click();
 await page.getByLabel('Project name',{exact:true}).fill('My infrastructure');expect(h.requests.filter(r=>r.method==='POST')).toHaveLength(0);
 await page.getByRole('button',{name:'Create environment',exact:true}).click();await expect(page.getByText('Operator permission required.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Generate enrollment',exact:true})).toBeDisabled();
 allow=true;await page.getByRole('button',{name:'Create environment',exact:true}).click();await expect(page.getByLabel('Environment',{exact:true})).toHaveValue(id);
 await expect(page.getByText(/No server has been connected yet/)).toBeVisible();
 await page.getByLabel('Hostname',{exact:true}).fill('app-01');await expect(page.getByRole('button',{name:'Generate enrollment',exact:true})).toBeEnabled();
 expect(h.requests.filter(r=>r.method==='POST'&&r.path==='/api/servers')).toHaveLength(0);
 const box=await page.getByRole('dialog').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);h.verify();
});
