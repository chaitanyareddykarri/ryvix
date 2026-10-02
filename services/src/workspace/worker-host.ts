export function workerPreviewDomain(hostId: string, env: NodeJS.ProcessEnv = process.env) {
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(hostId)) throw new Error('Valid stable worker host ID required');
  let entries: Record<string,unknown>;
  try { entries=JSON.parse(env.RYVIX_WORKER_PREVIEW_DOMAINS || '{}'); }
  catch { throw new Error('Worker preview domain allowlist must be JSON'); }
  const value=entries?.[hostId];
  if(typeof value!=='string' || value.length>200 || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(value) || /(^|\.)(localhost|local|internal)$/.test(value))
    throw new Error('Worker host has no approved public preview domain');
  if(Object.values(entries).filter(domain=>domain===value).length!==1)throw new Error('Worker preview domains must be distinct');
  return value;
}
export function workerHostConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const hostId=env.RYVIX_WORKER_HOST_ID || '';
  const domain=workerPreviewDomain(hostId,env);
  if(domain!==env.PREVIEW_BASE_DOMAIN)throw new Error('Worker preview domain does not match its host allowlist');
  return {hostId,domain};
}
