// Test-process guard only. Never imported by application code.
const net = require('node:net');
const tls = require('node:tls');
const dgram = require('node:dgram');
const dns = require('node:dns');
const { syncBuiltinESMExports } = require('node:module');
let violations = 0;
function blocked() {
  violations++;
  throw new Error('OFFLINE_NETWORK_BLOCKED: replace external transport with an explicit test fixture');
}
function local(host) { return ['127.0.0.1', '::1', 'localhost'].includes(host); }
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = args[0];
  const options = Array.isArray(first) ? first[0] : first;
  const host = typeof options === 'object' ? options.host : typeof args[1] === 'string' ? args[1] : 'localhost';
  if ((typeof options === 'object' && options.path) || typeof options === 'string') return connect.apply(this,args);
  if (!local(host || 'localhost')) return blocked();
  return connect.apply(this, args);
};
tls.connect = blocked;
dgram.createSocket = blocked;
const lookup = dns.lookup;
dns.lookup = function(host, ...args) { if (!local(host)) return blocked(); return lookup.call(this, host, ...args); };
dns.promises.lookup = async function(host, ...args) { if (!local(host)) return blocked(); return require('node:util').promisify(lookup)(host, ...args); };
for (const key of Object.keys(dns)) if (key.startsWith('resolve') || key === 'reverse') dns[key] = blocked;
for (const key of Object.keys(dns.promises)) if (key.startsWith('resolve') || key === 'reverse') dns.promises[key] = async () => blocked();
const originalFetch = globalThis.fetch;
globalThis.fetch = async function(input, options) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.protocol !== 'http:' || !local(url.hostname)) return blocked();
  return originalFetch(input, { ...options, redirect: 'error' });
};
syncBuiltinESMExports();
process.on('exit', () => { if (violations) { console.error(`Offline guard: ${violations} unexpected external network attempt(s).`); process.exitCode = 1; } });
