import fs from 'node:fs';
import {spawn} from 'node:child_process';
const role=process.argv[2];
const scripts={workspace:'workspace-worker.ts',operations:'operations-worker.ts',gmail:'gmail-worker.ts',whatsapp:'whatsapp-assistant-worker.ts',experience:'experience-worker.ts'};
try {
  if (!Object.hasOwn(scripts,role)) throw new Error('Unknown worker role');
  fs.accessSync('/app/ai/data',fs.constants.W_OK);
  if (['workspace','whatsapp'].includes(role)) {
    const provider=process.env.RYVIX_MODEL_PROVIDER;
    const chain=process.env.RYVIX_MODEL_FALLBACK_ORDER?.trim();
    const providers=chain?chain.split(',').map(id=>id.trim()):[provider];
    if (chain && (new Set(providers).size!==providers.length || (provider && provider!==providers[0]))) throw new Error('Invalid model fallback order');
    for (const provider of providers) {
    if (!['gemini','groq','openai','claude'].includes(provider) || !process.env[`${provider.toUpperCase()}_MODEL`]?.trim()) throw new Error('Explicit supported provider and model required');
    if (process.env.RYVIX_CHAT_PROVIDER && process.env.RYVIX_CHAT_PROVIDER !== providers[0]) throw new Error('Chat/model provider selections conflict');
    const key=provider==='claude'?'ANTHROPIC_API_KEY':`${provider.toUpperCase()}_API_KEY`;
    if (!process.env[key]?.trim()) throw new Error('Selected model credential missing');
    }
  }
  if (role==='workspace' && (!process.env.RYVIX_WORKSPACE_MAX_SESSIONS || !process.env.RYVIX_WORKSPACE_MEMORY_BUDGET_MB || !process.env.RYVIX_WORKSPACE_CPU_BUDGET)) throw new Error('Workspace host budget required');
  const child=spawn(process.execPath,['--import','tsx',`scripts/${scripts[role]}`],{stdio:'inherit'});
  for (const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>child.kill(signal));
  child.on('error',()=>{console.error('Worker process could not start');process.exitCode=1;});
  child.on('exit',(code,signal)=>{process.exitCode=code??(signal?1:0);});
} catch(error) { console.error(error.message);process.exitCode=1; }
