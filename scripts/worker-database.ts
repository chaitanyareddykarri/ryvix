import {Pool} from 'pg';

/** Idle socket errors must not become unhandled events. Never replay failed SQL. */
export function createWorkerPool(name:string,max:number,statementTimeout?:number){
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
  const url=new URL(process.env.DATABASE_URL);
  for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
  const pool=new Pool({connectionString:url.toString(),max,connectionTimeoutMillis:10000,
    keepAlive:true,keepAliveInitialDelayMillis:10000,
    ...(statementTimeout===undefined?{}:{statement_timeout:statementTimeout}),
    ssl:{rejectUnauthorized:true,...(process.env.DATABASE_CA_CERT?{ca:process.env.DATABASE_CA_CERT}:{})}});
  pool.on('error',()=>console.error(`${name} worker database connection unavailable.`));
  return pool;
}
