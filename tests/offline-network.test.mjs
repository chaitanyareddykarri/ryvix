import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const guard=resolve('tests/helpers/offline-network.cjs');
for(const [name,code] of [
 ['fetch',"fetch('https://provider.invalid').catch(()=>{})"],
 ['TCP',"try{require('node:net').connect(443,'203.0.113.1')}catch{}"],
 ['TLS',"try{require('node:tls').connect(443,'provider.invalid')}catch{}"],
 ['DNS',"try{require('node:dns').resolve4('provider.invalid',()=>{})}catch{}"],
 ['UDP',"try{require('node:dgram').createSocket('udp4')}catch{}"],
])test(`offline guard fails even when ${name} rejection is swallowed`,()=>{
 const result=spawnSync(process.execPath,['--require',guard,'-e',code],{encoding:'utf8',env:{...process.env,NODE_OPTIONS:''},windowsHide:true});
 assert.equal(result.status,1);assert.match(result.stderr,/unexpected external network attempt/);
});
test('offline guard allows an explicit in-process fetch fixture',()=>{
 const result=spawnSync(process.execPath,['--require',guard,'-e',"global.fetch=async()=>Response.json({fixture:true});fetch('https://provider.invalid').then(async r=>{if(!(await r.json()).fixture)process.exitCode=1})"],{encoding:'utf8',env:{...process.env,NODE_OPTIONS:''},windowsHide:true});
 assert.equal(result.status,0,result.stderr);
});
