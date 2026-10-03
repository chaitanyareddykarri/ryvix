import {Pool} from 'pg';
import {ExperienceCollector} from '../backend/src/services/experience-collector';
import {RepositoryKnowledge} from '../backend/src/services/repository-knowledge';
async function main(){
  const collect=process.env.RYVIX_EXPERIENCE_COLLECTION_ENABLED==='true',index=process.env.RYVIX_REPOSITORY_KNOWLEDGE_ENABLED==='true';
  if(!collect&&!index)throw new Error('Experience worker is not enabled');
  const url=new URL(process.env.DATABASE_URL!);for(const k of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(k);
  const pool=new Pool({connectionString:url.toString(),max:2,connectionTimeoutMillis:10000,ssl:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT}});
  pool.on('error',()=>console.error('Experience database connection unavailable.'));
  const abort=new AbortController();process.once('SIGTERM',()=>abort.abort());process.once('SIGINT',()=>abort.abort());
  const worker=new ExperienceCollector(pool);
  try{do{
    try{console.log(JSON.stringify({collected:collect?await worker.run(abort.signal):0,at:new Date().toISOString()}));}
    catch{console.error('Experience iteration incomplete; inspect database access and reviewed checkpoint validity.');if(process.argv.includes('--once'))process.exitCode=1;}
    if(index&&!abort.signal.aborted)try{await new RepositoryKnowledge(pool).indexOne(abort.signal);}catch{console.error('Repository indexing incomplete; inspect authorization and GitHub access.');if(process.argv.includes('--once'))process.exitCode=1;}
    if(process.argv.includes('--once')||abort.signal.aborted)break;
    await new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);abort.signal.removeEventListener('abort',done);resolve();};const timer=setTimeout(done,60000);abort.signal.addEventListener('abort',done,{once:true});});
  }while(!abort.signal.aborted);}finally{await pool.end();}
}
main().catch(()=>{console.error('Experience worker not started. Check enable flag, migration and verified database TLS.');process.exitCode=1;});
