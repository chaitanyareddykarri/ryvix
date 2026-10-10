import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';
test('dashboard exposes every operational destination on a phone',async({page})=>{
 await page.setViewportSize({width:375,height:800});const h=await mount(page,'web/app/dashboard/page.tsx');
 await page.getByText('Workspace tools',{exact:true}).click();
 const nav=page.locator('.workspace-navigation');
 for(const path of ['/releases','/server-approvals','/notifications','/knowledge','/experience','/learning','/learning/external','/profile/whatsapp','/usage'])await expect(nav.locator(`a[href="${path}"]`).last()).toBeVisible();
 const box=await nav.locator('.workspace-menu').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(375);h.verify();
});
test('dashboard deployments uses recorded observations and distinguishes unknown health',async({page})=>{
 const h=await mount(page,'web/app/dashboard/page.tsx',{responses:{'/api/deployments/runtime':{targets:[{id:'mapping',full_name:'fixture/project',provider_environment:'production',environment_name:'Production',endpoint_url:'https://fixture.test/health',observed_at:null}]}}});
 await page.getByRole('button',{name:'Deployments',exact:true}).first().click();
 await expect(page.getByText('fixture/project / production')).toBeVisible();await expect(page.getByText('No runtime observation recorded.')).toBeVisible();h.verify();
});
test('deployment access failure is visible',async({page})=>{
 const h=await mount(page,'web/components/DeploymentOverview.tsx',{responses:{'/api/deployments/runtime':{status:403,body:{error:'Access revoked'}}}});
 await expect(page.getByRole('alert')).toHaveText('Access revoked');await expect(page.getByText('No deployment mappings configured.')).toHaveCount(0);h.verify();
});
test('API key revocation requires confirmation and preserves denied results',async({page})=>{
 const key={id:'11111111-1111-4111-8111-111111111111',name:'Fixture key',key_prefix:'fixture',scopes:['read']};let allow=false;
 const h=await mount(page,'web/app/dashboard/page.tsx',{responses:{'/api/settings':async(route,request)=>{
  if(request.method()==='GET')return route.fulfill({json:{organization:{name:'Fixture'},apiKeys:[key],members:[],currentRole:'admin'}});
  expect(request.postDataJSON()).toEqual({action:'revoke_key',keyId:key.id});
  return route.fulfill({status:allow?200:403,json:allow?{success:true,revokedKeyId:key.id}:{success:false,error:'Permission revoked'}});
 }}});
 await page.getByRole('button',{name:'Settings',exact:true}).first().click();
 const revoke=page.getByRole('button',{name:'Revoke Fixture key'});await expect(revoke).toBeVisible();
 page.once('dialog',dialog=>dialog.dismiss());await revoke.click();expect(h.requests.filter(r=>r.method==='POST')).toHaveLength(0);
 page.once('dialog',dialog=>dialog.accept());await revoke.click();await expect(page.getByText('Permission revoked',{exact:true})).toBeVisible();await expect(revoke).toBeVisible();
 allow=true;page.once('dialog',dialog=>dialog.accept());await revoke.click();await expect(revoke).toHaveCount(0);await expect(page.getByText('API key revoked.',{exact:true})).toBeVisible();h.verify();
});
