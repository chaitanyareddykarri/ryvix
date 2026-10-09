import assert from 'node:assert/strict';
import {ModelGateway} from '../ai/src/model-gateway';

async function main() {
  if (!process.argv.includes('--live')) throw new Error('Pass --live to authorize a small real provider request');
  const provider=process.env.RYVIX_MODEL_PROVIDER;
  if (!provider || !['gemini','groq','openai','claude'].includes(provider)) throw new Error('Configure an explicit supported provider');
  const model=process.env[`${provider.toUpperCase()}_MODEL`];
  if (!model?.trim()) throw new Error('Configure an explicit model');
  // This probe verifies the selected provider itself, not a successful backup.
  delete process.env.RYVIX_MODEL_FALLBACK_ORDER;
  delete process.env.RYVIX_CHAT_PROVIDER;
  const attempts: Array<{status:string}> = [];
  const result=await new ModelGateway().complete([{role:'user',content:'Return only the JSON object {"ok":true}, without markdown.'}],
    {requireProvider:true,maxTokens:64,temperature:0,onAttempt:attempt=>{attempts.push({status:attempt.status});}});
  assert.deepEqual(JSON.parse(result.content.trim()),{ok:true});
  assert.equal(result.providerUsed,provider);assert.equal(result.modelUsed,model);
  console.log(JSON.stringify({verified:true,provider,model,attempts,promptTokens:result.promptTokens,completionTokens:result.completionTokens}));
}
main().catch(()=>{console.error('Selected model acceptance failed; check explicit model, credentials, quota and structured response support. Provider content and secrets are suppressed.');process.exitCode=1;});
