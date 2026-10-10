import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';
test('failed task keeps check attempts and skipped checks visible',async({page})=>{
 const id='11111111-1111-4111-8111-111111111111';
 const pipeline=[{stage:'analysis',status:'passed',attempt:1,detail:'Node.js'},
  {stage:'test',status:'failed',attempt:1,exitCode:1},{stage:'repair',status:'passed',attempt:1},
  {stage:'test',status:'failed',attempt:2,exitCode:2},{stage:'build',status:'skipped',attempt:1},
  {stage:'preview',status:'running',attempt:1}];
 const h=await mount(page,'web/app/tasks/page.tsx',{query:'?task='+id,responses:{'/api/tasks':{tasks:[{id,status:'failed',user_prompt:'Change page',pipeline}]}}});
 const section=page.getByRole('region',{name:'Recorded task checks'});
 await expect(section.getByText(/Stack analysis/)).toBeVisible();
 await expect(section.getByText(/Attempt 2 · failed · exit 2/)).toBeVisible();
 await expect(section.getByText(/Build.*skipped/)).toBeVisible();
 await expect(section.getByText(/Interrupted \/ no completion recorded/)).toBeVisible();
 expect(h.requests.some(x=>x.method==='POST')).toBe(false);h.verify();
});
