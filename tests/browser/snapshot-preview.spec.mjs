import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';
const id='11111111-1111-4111-8111-111111111111';
test('saved changes render locally with styles, scripts and opaque origin, then reload',async({page})=>{
 let heading='New homepage';
 const h=await mount(page,'web/app/dashboard/page.tsx',{responses:{
 '/api/tasks':{tasks:[{id,status:'awaiting_approval',user_prompt:'Modern homepage',result:{files:[{filename:'index.html',content:'saved'}]}}]},
 [`/api/tasks/${id}/browser-preview`]:route=>route.fulfill({json:{files:{'index.html':`<h1>${heading}</h1><link rel="stylesheet" href="style.css"><script src="app.js"></script>`,'style.css':'h1{color:rgb(12, 34, 56)}','app.js':"document.body.dataset.executed='yes';try{parent.document.body.dataset.escaped='yes'}catch{}"}}})
 }});
 await page.getByRole('button',{name:'AI Assistant',exact:true}).click();
 await page.getByRole('button',{name:/After \(AI Preview\)/}).first().click();
 const frame=page.frameLocator('iframe[title="Saved code preview"]').first();
 await expect(frame.locator('h1')).toHaveText('New homepage');
 await expect(frame.locator('h1')).toHaveCSS('color','rgb(12, 34, 56)');
 await expect(frame.locator('body')).toHaveAttribute('data-executed','yes');
 expect(await page.locator('body').getAttribute('data-escaped')).toBe(null);
 heading='Updated homepage';await page.getByRole('button',{name:'Reload snapshot'}).first().click();
 await expect(frame.locator('h1')).toHaveText('Updated homepage');h.verify();
});
test('chat interruption retains answer text and question across tab changes',async({page})=>{
 const h=await mount(page,'web/app/dashboard/page.tsx',{responses:{'/api/chat':route=>route.fulfill({contentType:'text/event-stream',body:'data: {"chunk":"Measured answer remains"}\n\ndata: {"error":"interrupted"}\n\n'})}});
 await page.getByRole('button',{name:'AI Assistant',exact:true}).click();
 const input=page.getByPlaceholder('Ask Ryvix AGI to modify code, analyze logs, or optimize latency...');
 await input.fill('Explain my project');await input.press('Enter');
 await expect(page.getByText(/Measured answer remains/)).toBeVisible();
 await expect(page.getByText(/partial answer above is preserved/)).toBeVisible();
 await page.getByRole('button',{name:'Security',exact:true}).click();
 await page.getByRole('button',{name:'AI Assistant',exact:true}).click();
 await expect(page.getByText(/Measured answer remains/)).toBeVisible();h.verify();
});
test('monitoring labels generated values as simulated',async({page})=>{
 const h=await mount(page,'web/app/observability/page.tsx');
 await expect(page.getByRole('region',{name:'Vercel simulated monitoring'})).toBeVisible();
 await expect(page.getByText(/not measurements from Vercel/)).toBeVisible();
 await page.getByRole('button',{name:'Generate demo sample'}).click();h.verify();
});
