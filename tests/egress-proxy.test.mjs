import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
const {publicIPv4,allowedTarget,createProxy,DEFAULT_HOSTS}=createRequire(import.meta.url)('../infrastructure/workspaces/egress-proxy.cjs');

test('broker permits exact HTTPS registry hosts only',()=>{
  const hosts=new Set(DEFAULT_HOSTS);
  assert.equal(allowedTarget('registry.npmjs.org:443',hosts),'registry.npmjs.org');
  for(const target of ['registry.npmjs.org.evil.test:443','registry.npmjs.org:80','registry.npmjs.org.:443','127.0.0.1:443','169.254.169.254:443','[::1]:443','user@github.com:443'])assert.equal(allowedTarget(target,hosts),null);
});
test('broker rejects non-public IPv4 and IPv6 destinations',()=>{
  for(const address of ['0.0.0.0','10.0.0.1','100.64.0.1','127.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','192.0.2.1','198.18.0.1','198.51.100.1','203.0.113.1','224.0.0.1','255.255.255.255','::1','::ffff:127.0.0.1'])assert.equal(publicIPv4(address),false,address);
  assert.equal(publicIPv4('1.1.1.1'),true);
});
async function attempt(options){
  const server=createProxy(options);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{return await new Promise((resolve,reject)=>{
    const request=http.request({host:'127.0.0.1',port:server.address().port,method:'CONNECT',path:'github.com:443'});
    request.on('connect',(response,socket)=>{socket.destroy();resolve(response.statusCode);});
    request.on('error',reject);request.end();
  });}finally{await new Promise(resolve=>server.close(resolve));}
}
test('broker rejects DNS rebinding to private addresses before connecting',async()=>{
  let connected=false;
  assert.equal(await attempt({lookup:async()=>[{address:'1.1.1.1'},{address:'127.0.0.1'}],connect:()=>{connected=true;}}),403);
  assert.equal(connected,false);
});
test('broker pins validated DNS address without a second lookup',async()=>{
  let target;
  // Fail the transport after inspecting the requested address; no external traffic.
  const server=createProxy({lookup:async()=>[{address:'1.1.1.1'}],connect:options=>{target=options;throw new Error('test transport');}});
  const client=new EventEmitter();client.setTimeout=()=>{};client.end=()=>{};client.destroy=()=>{};
  server.emit('connect',{url:'github.com:443'},client,Buffer.alloc(0));
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(target,{host:'1.1.1.1',port:443,family:4});
});
