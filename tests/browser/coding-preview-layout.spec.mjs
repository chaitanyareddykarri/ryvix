import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';
for(const width of [320,768,1024,1440])test(`coding assistant and preview fit ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const h=await mount(page,'web/app/dashboard/page.tsx');
 await page.getByRole('button',{name:'AI Assistant',exact:true}).click();
 await expect(page.locator('.dashboard-coding-grid')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 const escaped=await page.locator('.dashboard-coding-grid button,.preview-toolbar').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&(r.left<0||r.right>innerWidth+1);}).map(n=>n.textContent));
 expect(escaped).toEqual([]);h.verify();
});
