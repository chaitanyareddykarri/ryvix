import {test,expect} from '@playwright/test';
import {mount} from './harness.mjs';
for(const width of [320,375,1280])test(`Google sign-in and signup keep manual fields at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});const h=await mount(page,'web/app/login/page.tsx');
 await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
 await page.getByRole('button',{name:'Continue with Google'}).click();
 await expect(page.getByText('Google sign-in is unavailable. Please try again or use email and password.')).toBeVisible();
 expect(await page.evaluate(()=>window.__oauthCalls)).toEqual([{provider:'google',options:{redirectTo:'http://ryvix.test/auth/callback',queryParams:{prompt:'select_account'}}}]);
 await page.locator('#tab-btn-signup').click();await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
 await expect(page.locator('input[type="email"]')).toBeVisible();await expect(page.locator('input[type="password"]')).toHaveCount(2);
 await page.getByRole('button',{name:'Continue with Google'}).click();expect(await page.evaluate(()=>window.__oauthCalls.length)).toBe(2);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);h.verify();
});
test('Google navigation holds loading state and avoids duplicate requests',async({page})=>{
 const h=await mount(page,'web/app/login/page.tsx');await page.evaluate(()=>{window.__oauthResult={data:{url:'https://fixture.invalid/authorize'},error:null};});
 await page.getByRole('button',{name:'Continue with Google'}).click();await expect(page.getByRole('button',{name:'Continue with Google'})).toBeDisabled();
 expect(await page.evaluate(()=>window.__oauthCalls.length)).toBe(1);h.verify();
});
test('manual email and password login still reaches the password API',async({page})=>{
 const h=await mount(page,'web/app/login/page.tsx');
 await page.locator('input[type="email"]').fill('person@example.test');await page.locator('input[type="password"]').fill('fixture-password');
 await page.locator('form button[type="submit"]').click();await expect(page.getByText('Invalid email or password.',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.__passwordCalls)).toEqual([{email:'person@example.test',password:'fixture-password'}]);
 expect(await page.evaluate(()=>window.__oauthCalls||[])).toEqual([]);h.verify();
});
test('workspace error offers retry without reflecting provider details',async({page})=>{
 const h=await mount(page,'web/app/auth/error/page.tsx',{query:'?reason=workspace&error_description=untrusted-secret'});
 await expect(page.getByRole('link',{name:'Retry workspace check'})).toHaveAttribute('href','/auth/callback?retry=1');
 await expect(page.getByText('untrusted-secret')).toHaveCount(0);h.verify();
});
