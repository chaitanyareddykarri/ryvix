import {Pool} from 'pg';

/** Idle socket errors must not become unhandled events. Never replay failed SQL. */
export function createWorkerPool(name:string,max:number,statementTimeout?:number,requiresSession=false){
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
  const url=new URL(process.env.DATABASE_URL);
  // Session advisory locks must remain on a stable backend connection.
  if(requiresSession&&url.port==='6543')throw new Error('This worker requires a direct or session-mode database connection');
  const configured=process.env.RYVIX_WORKER_POOL_MAX;
  if(configured!==undefined){
    if(!/^[2-9]$/.test(configured)||Number(configured)>max)throw new Error(`RYVIX_WORKER_POOL_MAX must be an integer from 2 to ${max}`);
    max=Number(configured);
  }
  for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
  const pool=new Pool({connectionString:url.toString(),max,connectionTimeoutMillis:10000,
    keepAlive:true,keepAliveInitialDelayMillis:10000,
    ...(statementTimeout===undefined?{}:{statement_timeout:statementTimeout}),
    ssl:{rejectUnauthorized:true,...(process.env.DATABASE_CA_CERT?{ca:process.env.DATABASE_CA_CERT}:{})}});
  pool.on('error',()=>console.error(`${name} worker database connection unavailable.`));
  return pool;
}
