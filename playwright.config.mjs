import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
export default defineConfig({
  testDir:'./tests/browser',timeout:30000,workers:1,reporter:'list',
  use:{headless:true,serviceWorkers:'block',viewport:{width:1280,height:900},
    launchOptions:{...(process.env.RYVIX_TEST_BROWSER?{executablePath:process.env.RYVIX_TEST_BROWSER}:existsSync(chrome)?{executablePath:chrome}:{})}},
});
