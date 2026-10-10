import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';

test('server demo stays simulated and code edits update the isolated preview',async({page})=>{
  const h=await mount(page,'web/app/servers/demo/page.tsx');
  await expect(page.getByText('DEMO — sample data only.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Connect demo repository',exact:true}).click();
  await expect(page.getByText('Demo repository linked to demo-web-01 (simulated).',{exact:true})).toBeVisible();
  await page.getByLabel('Demo scenario').selectOption('security');
  await expect(page.getByText(/No real attack was detected/)).toBeVisible();
  await page.getByLabel('Website URL for simulated metrics').fill('https://customer.example.test/private?token=not-real');
  await page.getByRole('button',{name:'Generate random demo metrics'}).click();
  await expect(page.getByText('SIMULATED metrics for https://customer.example.test',{exact:true})).toBeVisible();
  await expect(page.getByText(/Sample response time:/)).toBeVisible();
  await expect(page.getByText(/This URL was not contacted/)).toBeVisible();
  await page.getByLabel('Website URL for simulated metrics').fill('https://another.example.test');
  await expect(page.getByText(/SIMULATED metrics for/)).toHaveCount(0);
  const frame=page.frameLocator('iframe[title="Editable demo preview"]');
  await expect(frame.getByRole('heading',{name:'My demo website'})).toBeVisible();
  await page.getByLabel('Demo page source').fill('<h1>Updated page</h1><script>document.body.dataset.executed="yes"</script>');
  await expect(frame.getByRole('heading',{name:'Updated page'})).toBeVisible();
  await expect(frame.locator('body')).toHaveAttribute('data-executed','yes');
  await expect(page.locator('iframe')).toHaveAttribute('sandbox','allow-scripts');
  await expect(frame.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content',/connect-src 'none'/);
  await page.getByRole('button',{name:'Reset demo code'}).click();
  await expect(frame.getByRole('heading',{name:'My demo website'})).toBeVisible();
  expect(h.requests.some(r=>r.method==='POST'||r.method==='PUT'||r.method==='DELETE')).toBe(false);
  h.verify();
});

test('real preview reloads after task verification and supports manual reload',async({page})=>{
  const id='11111111-1111-4111-8111-111111111111';
  let complete=false,loads=0;
  const task=()=>({id,status:complete?'awaiting_approval':'verifying',updated_at:complete?'2026-10-10T12:01:00Z':'2026-10-10T12:00:00Z',created_at:'2026-10-10T12:00:00Z',user_prompt:'Update page',workspace:{previewUrl:'http://ryvix.test/fixture-preview'},result:{files:[]}});
  const h=await mount(page,'web/app/dashboard/page.tsx',{responses:{
    '/api/workspace':{sessions:[{preview_url:'http://ryvix.test/fixture-preview'}]},
    '/api/tasks':async route=>route.fulfill({json:{tasks:[task()]}}),
    '/fixture-preview':async route=>{loads++;await route.fulfill({contentType:'text/html',body:`<h1>${complete?'Updated':'Before'} page</h1>`});},
  }});
  await page.getByRole('button',{name:'Previews',exact:true}).click();
  const frame=page.frameLocator('iframe[title^="Sandboxed Preview"]').first();
  await expect(frame.getByRole('heading',{name:'Before page'})).toBeVisible();
  complete=true;
  await expect(frame.getByRole('heading',{name:'Updated page'})).toBeVisible({timeout:10000});
  const previous=loads;
  await page.getByRole('button',{name:'Reload preview',exact:true}).first().click();
  await expect.poll(()=>loads).toBeGreaterThan(previous);
  h.verify();
});
