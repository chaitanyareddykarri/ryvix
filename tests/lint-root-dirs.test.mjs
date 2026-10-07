import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {getRootDirs}=require('@next/eslint-plugin-next/dist/utils/get-root-dirs.js');
test('Next lint root discovery preserves directory glob and Windows path behavior',()=>{
 const root=mkdtempSync(join(tmpdir(),'ryvix-lint-roots-'));
 try{
  mkdirSync(join(root,'web'));mkdirSync(join(root,'admin'));
  writeFileSync(join(root,'not-a-directory'),'fixture');
  const normalized=root.replaceAll('\\','/');
  const discover=rootDir=>getRootDirs({cwd:root,settings:{next:{rootDir}}}).sort();
  assert.deepEqual(discover(undefined),[root]);
  assert.deepEqual(discover(`${normalized}/*`),[`${normalized}/admin`,`${normalized}/web`]);
  assert.deepEqual(discover(`${normalized}/{web,admin}`),[`${normalized}/admin`,`${normalized}/web`]);
  assert.deepEqual(discover([`${normalized}/web`,`${normalized}/admin`,null]),[`${normalized}/admin`,`${normalized}/web`]);
  assert.deepEqual(discover(`${normalized}/missing/*`),[]);
  assert.deepEqual(discover(`${normalized}/web`.replaceAll('/','\\')),[`${normalized}/web`]);
 }finally{rmSync(root,{recursive:true,force:true});}
});
