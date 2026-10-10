'use strict';
// Trusted tooling outside the customer-writable tree. Never evaluates customer JS.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const root = process.cwd();
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};
function inspect() {
  const files = new Map(); let bytes = 0;
  function walk(dir, depth = 0) {
    if (depth > 12) throw Error('Directory depth exceeded');
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      if (dir === root && entry.name === '.git') continue;
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(entry.name) || entry.isSymbolicLink()) throw Error('Unsupported path');
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full, depth + 1); continue; }
      const name = path.relative(root, full).split(path.sep).join('/');
      const stat = fs.lstatSync(full);
      if (!stat.isFile() || !(types[path.extname(name).toLowerCase()] || name === 'LICENSE') || stat.size > 32768) throw Error('Unsupported static file');
      bytes += stat.size;
      if (bytes > 262144 || files.size >= 64) throw Error('Static size limit exceeded');
      const data = fs.readFileSync(full);
      if (data.includes(0)) throw Error('Binary files are unsupported');
      files.set(name, data);
    }
  }
  walk(root);
  if (!files.has('index.html')) throw Error('index.html is required');
  return files;
}
try {
  const files = inspect();
  if (process.argv[2] === 'check') {
    for (const [name] of files) if (name.toLowerCase().endsWith('.js')) {
      // Syntax checking parses the file without running it or loading imports.
      const result = spawnSync(process.execPath, ['--check', path.join(root,name)], {timeout:5000, maxBuffer:16384});
      if (result.status !== 0) throw Error('JavaScript syntax check failed');
    }
    console.log('Static file bounds and JavaScript syntax passed; no build or browser tests executed.');
  } else if (process.argv[2] === 'serve') {
    const server = http.createServer((req,res) => {
      if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
      let name;
      try { name = decodeURIComponent(new URL(req.url,'http://preview.invalid').pathname).slice(1) || 'index.html'; }
      catch { res.writeHead(400); res.end(); return; }
      const data = files.get(name);
      if (!data) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, {'Content-Type':types[path.extname(name).toLowerCase()] || 'text/plain', 'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
      res.end(req.method === 'HEAD' ? undefined : data);
    });
    server.maxConnections = 16; server.requestTimeout = 10000; server.headersTimeout = 10000;
    server.listen(3000,'0.0.0.0');
  } else throw Error('Unknown static tool command');
} catch (error) { console.error(error.message); process.exitCode = 1; }
