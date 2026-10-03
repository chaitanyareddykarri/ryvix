import fs from 'node:fs';
import { parseEnv } from 'node:util';
import { scoreAnswer, type AnswerCase } from '../ai/src/answer-evaluation';
import { CHAT_SYSTEM_PROMPT } from '../ai/src/chat-policy';
import {createHash} from 'node:crypto';

async function main() {
  const argument=(flag:string)=>{const i=process.argv.indexOf(flag);return i>=0?process.argv[i+1]:undefined;};
  const fixtureText=fs.readFileSync(argument('--cases')||'tests/fixtures/chat-evaluation.json','utf8');
  const fixtures: AnswerCase[] = JSON.parse(fixtureText);
  if(!Array.isArray(fixtures)||!fixtures.length||fixtures.length>200||new Set(fixtures.map(f=>f.id)).size!==fixtures.length||fixtures.some(f=>
    typeof f.id!=='string'||typeof f.question!=='string'||f.question.length>10000||!Array.isArray(f.required)||!Array.isArray(f.forbidden)))throw new Error('Invalid evaluation dataset');
  const datasetHash=createHash('sha256').update(fixtureText).digest('hex');
  const baselinePath=argument('--baseline');const baseline=baselinePath?JSON.parse(fs.readFileSync(baselinePath,'utf8')):null;
  if(baseline&&(baseline.datasetHash!==datasetHash||!Array.isArray(baseline.results)||baseline.results.length!==fixtures.length||
    fixtures.some(f=>!baseline.results.some((r:any)=>r.id===f.id&&typeof r.passed==='boolean'))))throw new Error('Comparable baseline required');
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
    const started=Date.now();
    let modelInfo: {provider:string;model:string} | undefined;
    let answer = typeof answers[fixture.id]==='string' ? answers[fixture.id] : '';
    if (live) for await (const chunk of modelGateway.stream([
      {role:'system',content:CHAT_SYSTEM_PROMPT},...(fixture.history || []),
      {role:'user',content:JSON.stringify({question:fixture.question,observations:fixture.evidence})},
    ],{maxTokens:4096,temperature:0.2,onProvider:(provider,model)=>{modelInfo={provider,model};}})) answer+=chunk;
    results.push({...scoreAnswer(fixture,answer),modelInfo,latencyMs:live?Date.now()-started:null});
  }
  const regressions=baseline?results.filter(r=>!r.passed&&baseline.results.find((b:any)=>b.id===r.id)?.passed).map(r=>r.id):[];
  const report={kind:'authored rubric evaluation (not production accuracy)',createdAt:new Date().toISOString(),datasetHash,
    promptHash:createHash('sha256').update(CHAT_SYSTEM_PROMPT).digest('hex'),mode:live?'live provider':'saved answers',
    passed:results.filter(r=>r.passed).length,total:results.length,regressions,eligible:results.every(r=>r.passed)&&!regressions.length,
    limitation:'Regex rubric checks require human correctness review; not fine-tuning, model activation or production accuracy.',results};
  if(argument('--report'))fs.writeFileSync(argument('--report')!,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report,null,2));
  if(!report.eligible)process.exitCode=1;
}
main().catch(()=>{console.error('Evaluation unavailable: check input files and model provider configuration. No quality score is claimed.');process.exitCode=1;});
