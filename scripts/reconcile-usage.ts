import {readFileSync,statSync} from 'node:fs';
import {reconcileUsage} from '../ai/src/usage-reconciliation';
try{
 const file=process.argv[2];if(!file||statSync(file).size>2097152)throw new Error();
 const input=JSON.parse(readFileSync(file,'utf8'));
 const results=reconcileUsage(input.local,input.provider,input.scope);
 console.log(JSON.stringify({kind:'saved usage export comparison',invoiceCertified:false,results},null,2));
 if(!results.length||results.some(r=>r.status!=='matched'))process.exitCode=1;
}catch{console.error('Provide a bounded JSON usage export with matching account and time-window scope.');process.exitCode=1;}
