import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';
const dashboard='web/app/dashboard/page.tsx';
const connection={id:'connector-fixture',name:'Business',project_name:'Project',phone:null,verified_at:null};

test('missing phone prompts each dashboard visit, supports Escape and a direct settings link',async({page})=>{
 const h=await mount(page,dashboard,{responses:{'/api/profile/contact':{phoneNumber:null}}});
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByLabel('Your WhatsApp number, with country code')).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.getByRole('button',{name:'Add your WhatsApp number',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('button',{name:'Later',exact:true}).click();
 await expect(page.getByRole('link',{name:'Phone / WhatsApp',exact:true})).toHaveAttribute('href','/profile/whatsapp');
 await page.reload();await expect(page.getByRole('dialog')).toBeVisible();h.verify();
});
for(const width of [320,375,390])test(`save contact without a provider at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:700});let phoneNumber=null;
 const h=await mount(page,dashboard,{responses:{'/api/profile/contact':async(route,request)=>{
  if(request.method()==='POST'){expect(request.postDataJSON()).toEqual({action:'save',phone:'+1 (555) 555-0123'});phoneNumber='+15555550123';}
  return route.fulfill({json:{phoneNumber}});
 }}});
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 await page.getByLabel('Your WhatsApp number, with country code').fill('+1 (555) 555-0123');
 await page.getByRole('button',{name:'Save phone number'}).click();await expect(page.getByText(/Contact number saved/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Send verification code'})).toBeDisabled();
 const box=await dialog.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
 expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 await page.getByRole('button',{name:'Done',exact:true}).click();await page.reload();
 await expect(page.getByRole('dialog')).not.toBeVisible();
 expect(h.requests.filter(r=>r.path==='/api/profile/phone'&&r.method==='POST')).toHaveLength(0);h.verify();
});
test('contact lookup and save errors stay visible without claiming success',async({page})=>{
 const h=await mount(page,'web/app/profile/whatsapp/page.tsx',{responses:{'/api/profile/contact':{status:503,body:{error:'Contact temporarily unavailable'}}}});
 await expect(page.getByRole('alert')).toContainText('Contact temporarily unavailable');
 await page.getByLabel('Your WhatsApp number, with country code').fill('+15555550123');await page.getByRole('button',{name:'Save phone number'}).click();
 await expect(page.getByText(/Contact number saved/)).toHaveCount(0);h.verify();
});
test('OTP is explicit, unknown delivery stays unknown, expired code remains an error',async({page})=>{
 const h=await mount(page,'web/app/profile/whatsapp/page.tsx',{responses:{'/api/profile/phone':async(route,request)=>{
  if(request.method()==='GET')return route.fulfill({json:{connections:[connection]}});
  const body=request.postDataJSON();
  if(body.action==='send')return route.fulfill({json:{challengeId:'challenge-fixture',delivery:'unknown'}});
  expect(body.action).toBe('verify');expect(body.connectorId).toBe(connection.id);expect(body.challengeId).toBe('challenge-fixture');
  return route.fulfill({status:400,json:{error:'Code invalid, expired, exhausted or number unavailable.'}});
 }}});
 await page.getByLabel('Business connection').selectOption(connection.id);expect(h.requests.filter(r=>r.method==='POST')).toHaveLength(0);
 await page.getByRole('button',{name:'Send verification code'}).click();await expect(page.getByRole('status')).toContainText('Delivery is uncertain');
 await page.getByLabel('Six-digit code').fill('123456');await page.getByRole('button',{name:'Verify number',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('expired');await expect(page.getByText(/WhatsApp number verified/)).toHaveCount(0);
 await page.getByLabel('Number to verify, with country code').fill('+15555550124');await expect(page.getByLabel('Six-digit code')).toHaveCount(0);h.verify();
});

test('dashboard popup verifies and unlinks only after explicit actions',async({page})=>{
 await page.setViewportSize({width:375,height:700});let verified=false;
 const h=await mount(page,dashboard,{responses:{
  '/api/profile/contact':async(route,request)=>route.fulfill({json:{phoneNumber:request.method()==='POST'?'+15555550123':null}}),
  '/api/profile/phone':async(route,request)=>{
   if(request.method()==='GET')return route.fulfill({json:{connections:[{...connection,phone:verified?'+15555550123':null}]}});
   const body=request.postDataJSON();
   if(body.action==='send')return route.fulfill({json:{challengeId:'fixture-challenge',delivery:'accepted'}});
   if(body.action==='verify'){expect(body.code).toBe('123456');verified=true;return route.fulfill({json:{verified:true}});}
   expect(body.action).toBe('remove');verified=false;return route.fulfill({json:{removed:true}});
  }
 }});
 await page.getByLabel('Your WhatsApp number, with country code').fill('+15555550123');await page.getByRole('button',{name:'Save phone number'}).click();
 await page.getByLabel('Business connection').selectOption(connection.id);
 expect(h.requests.filter(r=>r.path==='/api/profile/phone'&&r.method==='POST')).toHaveLength(0);
 await page.getByRole('button',{name:'Send verification code'}).click();
 await page.getByLabel('Six-digit code').fill('123456');await page.getByRole('button',{name:'Verify number',exact:true}).click();
 await expect(page.getByText('Verified number: +15555550123',{exact:false})).toBeVisible();
 expect(await page.getByRole('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 await page.getByRole('button',{name:'Unlink',exact:true}).click();await expect(page.getByRole('button',{name:'Unlink',exact:true})).toHaveCount(0);
 await expect(page.getByText(/Your saved profile contact is unchanged/)).toBeVisible();h.verify();
});

test('dashboard contact lookup failure does not claim missing data or open a modal',async({page})=>{
 const h=await mount(page,dashboard,{responses:{'/api/profile/contact':{status:503,body:{error:'Unavailable'}}}});
 await expect(page.getByRole('alert')).toContainText('Phone details unavailable');
 await expect(page.getByRole('dialog')).not.toBeVisible();h.verify();
});
