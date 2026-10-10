import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';

test('website checks show measured response and explicitly selected environment connectors',async({page})=>{
  const h=await mount(page,'web/app/websites/page.tsx',{responses:{
    '/api/connections':{environments:[{id:'env1',name:'Production',project_name:'Site'}],connections:[{id:'c1',name:'Site GitHub',type:'github',status:'active',environment_id:'env1'}]},
    '/api/monitoring/probe':async(route,request)=>{expect(request.postDataJSON()).toEqual({targetUrl:'https://example.test/'});await route.fulfill({json:{success:true,probe:{statusCode:200,latencyMs:123}}});},
  }});
  await page.getByLabel('Deployed website URL').fill('https://example.test/');
  await page.getByRole('button',{name:'Check website',exact:true}).click();
  await expect(page.getByText('123 ms',{exact:true})).toBeVisible();
  await expect(page.getByText('Site GitHub',{exact:true})).toHaveCount(0);
  await page.getByLabel('Environment',{exact:true}).selectOption('env1');
  await expect(page.getByText('Site GitHub',{exact:true})).toBeVisible();
  await page.getByLabel('Deployed website URL').fill('https://different.test/');
  await expect(page.getByText('123 ms',{exact:true})).toHaveCount(0);
  h.verify();
});

test('website checks show permission failures without fabricated metrics',async({page})=>{
  const h=await mount(page,'web/app/websites/page.tsx',{responses:{
    '/api/connections':{status:503,body:{error:'Connections unavailable.'}},
    '/api/monitoring/probe':{status:403,body:{success:false,error:'Operator permission required.'}},
  }});
  await page.getByLabel('Deployed website URL').fill('https://example.test/');
  await page.getByRole('button',{name:'Check website',exact:true}).click();
  await expect(page.getByText('Operator permission required.',{exact:true})).toBeVisible();
  await expect(page.getByText('Connections unavailable.',{exact:true})).toBeVisible();
  await expect(page.getByRole('region',{name:'Measured website response'})).toHaveCount(0);
  h.verify();
});
