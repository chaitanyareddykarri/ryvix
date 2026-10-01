import fs from 'node:fs';
import { parseEnv } from 'node:util';
import { scoreAnswer, type AnswerCase } from '../ai/src/answer-evaluation';
import { CHAT_SYSTEM_PROMPT } from '../ai/src/chat-policy';

async function main() {
  const fixtures: AnswerCase[] = JSON.parse(fs.readFileSync('tests/fixtures/chat-evaluation.json','utf8'));
  const live = process.argv.includes('--live');
  const answersAt = process.argv.indexOf('--answers');
  if (!live && (answersAt<0 || !process.argv[answersAt+1])) {
    console.log('Use --answers <JSON object keyed by case ID> to score saved answers, or --live to call configured providers. No model quality score was generated.');
    return;
  }
  const answers = live ? {} : JSON.parse(fs.readFileSync(process.argv[answersAt+1],'utf8'));
  if (live) {
    const defaults: Record<string,string> = {};
    for (const file of ['.env','.env.local','web/.env.local']) if (fs.existsSync(file)) Object.assign(defaults,parseEnv(fs.readFileSync(file,'utf8')));
    for (const [key,value] of Object.entries(defaults)) if (process.env[key]===undefined) process.env[key]=value;
  }
  const { modelGateway } = await import('../ai/src/model-gateway');
  const results=[];
  for (const fixture of fixtures) {
    let modelInfo: {provider:string;model:string} | undefined;
    let answer = typeof answers[fixture.id]==='string' ? answers[fixture.id] : '';
    if (live) for await (const chunk of modelGateway.stream([
      {role:'system',content:CHAT_SYSTEM_PROMPT},...(fixture.history || []),
      {role:'user',content:JSON.stringify({question:fixture.question,observations:fixture.evidence})},
    ],{maxTokens:4096,temperature:0.2,onProvider:(provider,model)=>{modelInfo={provider,model};}})) answer+=chunk;
    results.push({...scoreAnswer(fixture,answer),modelInfo});
  }
  console.log(JSON.stringify({kind:'authored rubric evaluation (not production accuracy)',passed:results.filter(r=>r.passed).length,total:results.length,results},null,2));
  if (results.some(r=>!r.passed)) process.exitCode=1;
}
main().catch(()=>{console.error('Evaluation unavailable: check input files and model provider configuration. No quality score is claimed.');process.exitCode=1;});
