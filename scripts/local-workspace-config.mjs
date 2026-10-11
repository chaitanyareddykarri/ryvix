export function localWorkspaceConfiguration(env){
  if(!env.DATABASE_URL?.trim())throw Error('DATABASE_URL is missing.');
  let database;try{database=new URL(env.DATABASE_URL);}catch{throw Error('DATABASE_URL is invalid.');}
  if(!['postgres:','postgresql:'].includes(database.protocol)||database.port==='6543')throw Error('Use a direct or session-mode PostgreSQL connection for worker locks.');
  const providers=(env.RYVIX_MODEL_FALLBACK_ORDER||env.RYVIX_MODEL_PROVIDER||'').split(',').map(s=>s.trim());
  const keys={gemini:'GEMINI_API_KEY',groq:'GROQ_API_KEY',openai:'OPENAI_API_KEY',claude:'ANTHROPIC_API_KEY'};
  if(!providers.length||new Set(providers).size!==providers.length||providers.some(p=>!keys[p]))throw Error('Configure a valid explicit model provider chain.');
  if(env.RYVIX_MODEL_PROVIDER&&env.RYVIX_MODEL_PROVIDER!==providers[0])throw Error('Primary provider conflicts with fallback order.');
  for(const provider of providers)if(!env[provider.toUpperCase()+'_MODEL']?.trim()||!(env[keys[provider]]||provider==='claude'&&env.CLAUDE_API_KEY)?.trim())throw Error('Model name or API key missing for '+provider+'.');
  if(!/^[a-f0-9]{64}$/i.test(env.PREVIEW_SIGNING_SECRET||''))throw Error('Configure a fresh 64-character hex PREVIEW_SIGNING_SECRET on worker and Vercel.');
  let map;try{map=JSON.parse(env.RYVIX_WORKER_PREVIEW_DOMAINS||'{}');}catch{throw Error('Worker preview domain map is invalid JSON.');}
  const domain=env.PREVIEW_BASE_DOMAIN;
  if(!domain||map[env.RYVIX_WORKER_HOST_ID]!==domain||!/^([a-z0-9-]+\.)+[a-z]{2,63}$/.test(domain))throw Error('Worker ID and public preview domain map must match.');
  let origin;try{origin=new URL(env.RYVIX_PUBLIC_URL);}catch{throw Error('RYVIX_PUBLIC_URL must be a public HTTPS origin.');}
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('RYVIX_PUBLIC_URL must be a public HTTPS origin.');
  const names=env.RYVIX_WORKSPACE_MODE==='static'?['RYVIX_WORKSPACE_STATIC_IMAGE','RYVIX_PREVIEW_RELAY_IMAGE']:['RYVIX_WORKSPACE_NODE_IMAGE','RYVIX_WORKSPACE_EGRESS_IMAGE'];
  const approved=(env.RYVIX_WORKSPACE_IMAGES||'').split(',');
  const images=names.map(name=>{if(!env[name]||!approved.includes(env[name]))throw Error(name+' must be set and approved in RYVIX_WORKSPACE_IMAGES.');return env[name];});
  return {domain,images:[...new Set(images)]};
}
