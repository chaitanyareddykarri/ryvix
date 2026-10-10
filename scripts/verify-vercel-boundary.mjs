import {build} from 'esbuild';
import {readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
function routes(dir) {return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?routes(path.join(dir,e.name)):e.name==='route.ts'?[path.join(dir,e.name)]:[]);}
// Bundle project dependencies for inspection only; never execute or load credentials.
const result=await build({entryPoints:routes('web/app/api'),bundle:true,write:false,metafile:true,
  outdir:'unused-vercel-audit',platform:'node',format:'esm',packages:'external',tsconfig:'web/tsconfig.json',
  external:['server-only','next','next/*'],
  alias:{'@ryvix/database':path.resolve('packages/database/src/index.ts'),'@ryvix/backend':path.resolve('backend/src/index.ts'),
    '@ryvix/ai':path.resolve('ai/src/index.ts'),'@ryvix/services':path.resolve('services/src/index.ts')},logLevel:'silent'});
for(const [file,metadata] of Object.entries(result.metafile.inputs)) {
  if(file.includes('node_modules'))continue;
  const source=readFileSync(file,'utf8');
  if(metadata.imports.some(i=>/^(@ryvix\/(ai|services)$|(?:node:)?child_process$)/.test(i.path) ||
      /^(?:node:)?fs(?:\/promises)?$/.test(i.path)) ||
     /(?:writeFileSync|mkdirSync|appendFileSync)\s*\(/.test(source))
    throw Error(`Serverless API dependency has a filesystem/process boundary requiring review: ${file}`);
}
console.log(`Vercel API boundary passed: ${Object.keys(result.metafile.inputs).length} project modules; no legacy AI persistence or host process imports. Chat/history/usage remain database-backed.`);
const traceIndex=process.argv.indexOf('--traces');
if(traceIndex!==-1){
  const folder=process.argv[traceIndex+1];if(!folder)throw Error('Build trace folder required');
  function traces(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?traces(path.join(dir,e.name)):e.name.endsWith('.nft.json')?[path.join(dir,e.name)]:[]);}
  const files=traces(folder);if(!files.length)throw Error('No build traces found');
  for(const file of files)for(const traced of JSON.parse(readFileSync(file,'utf8')).files||[])
    if(/\/ai\/data\//.test(path.resolve(path.dirname(file),traced).replaceAll('\\','/')))
      throw Error(`Runtime AI data included in build trace: ${file}`);
  console.log(`PASS: ${files.length} build traces exclude ai/data.`);
}
