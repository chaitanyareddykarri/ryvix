// Trusted HTTPS CONNECT broker. Customer containers remain on internal networks.
const http = require('node:http');
const net = require('node:net');
const dns = require('node:dns').promises;
const DEFAULT_HOSTS = ['github.com','api.github.com','codeload.github.com','objects.githubusercontent.com',
  'raw.githubusercontent.com','registry.npmjs.org','registry.yarnpkg.com','pypi.org','files.pythonhosted.org',
  'proxy.golang.org','sum.golang.org','storage.googleapis.com','index.crates.io','static.crates.io','api.nuget.org'];

function publicIPv4(value) {
  if (net.isIP(value)!==4) return false;
  const [a,b]=value.split('.').map(Number);
  return !(a===0 || a===10 || a===127 || a>=224 || (a===100 && b>=64 && b<=127) ||
    (a===169 && b===254) || (a===172 && b>=16 && b<=31) || (a===192 && (b===168 || b===0)) ||
    (a===198 && (b===18 || b===19 || b===51)) || (a===203 && b===0));
}
function allowedTarget(authority,hosts) {
  const match=/^([a-z0-9.-]+):443$/.exec(authority||'');
  return match && hosts.has(match[1]) && !net.isIP(match[1]) ? match[1] : null;
}
function createProxy({hosts=new Set(DEFAULT_HOSTS),lookup=dns.lookup,connect=net.connect}={}) {
  const server=http.createServer({maxHeaderSize:8192},(_req,res)=>{res.writeHead(405);res.end();});
  server.on('connect',async(req,client,head)=>{
    let upstream;
    const close=()=>{client.destroy();upstream?.destroy();};
    client.setTimeout(30000,close);client.on('error',close);client.on('close',()=>upstream?.destroy());
    const host=allowedTarget(req.url,hosts);
    if(!host){client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
    try {
      const result=await Promise.race([lookup(host,{family:4,all:true}),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('DNS timeout')),5000);timer.unref();})]);
      if(client.destroyed)return;
      if(!result.length||result.some(answer=>!publicIPv4(answer.address)))throw new Error('Non-public destination');
      // Pin the validated address instead of resolving a second time.
      upstream=connect({host:result[0].address,port:443,family:4});
      upstream.setTimeout(30000,close);upstream.on('error',close);upstream.on('close',()=>client.destroy());
      upstream.once('connect',()=>{
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if(head.length)upstream.write(head);
        let bytes=0;
        const count=chunk=>{bytes+=chunk.length;if(bytes>128*1024*1024)close();};
        client.on('data',count);upstream.on('data',count);
        client.pipe(upstream).pipe(client);
      });
    } catch {client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');}
  });
  server.on('clientError',(_error,socket)=>socket.destroy());
  server.maxConnections=64;server.headersTimeout=10000;server.requestTimeout=10000;
  return server;
}
module.exports={publicIPv4,allowedTarget,createProxy,DEFAULT_HOSTS};
if(require.main===module){
  createProxy().listen(3128,'0.0.0.0');
  const ttl=Number(process.env.RYVIX_EGRESS_TTL_MS||900000);
  setTimeout(()=>process.exit(0),Number.isFinite(ttl)?Math.max(1,Math.min(ttl,900000)):900000);
}
