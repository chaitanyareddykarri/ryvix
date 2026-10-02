import { NeuralThreatClassifier, NEURAL_THREAT_CLASSES } from './neural-network';
export interface ReviewedExample {id:string;label:string;partition:'train'|'validation'|'test';event:Record<string,unknown>;event_hash:string;status:string;reviewed_by:string;}

export function trainReviewedExamples(samples:ReviewedExample[], baseline?:Record<string,any>) {
  if(samples.length>2000 || samples.some(sample=>sample.status!=='approved'||!sample.reviewed_by||!NEURAL_THREAT_CLASSES.includes(sample.label)))throw new Error('Reviewed dataset required');
  if(new Set(samples.map(sample=>sample.event_hash)).size!==samples.length)throw new Error('Dataset leakage');
  const partitions={train:samples.filter(s=>s.partition==='train'),validation:samples.filter(s=>s.partition==='validation'),test:samples.filter(s=>s.partition==='test')};
  if(partitions.train.length<20||partitions.validation.length<10||partitions.test.length<10)throw new Error('At least 20 training, 10 validation and 10 held-out examples required');
  const labels=[...new Set(samples.map(s=>s.label))];
  if(Object.values(partitions).some(part=>labels.some(label=>!part.some(sample=>sample.label===label))))throw new Error('Every label must be represented in every partition');
  const model=new NeuralThreatClassifier();if(baseline)model.loadWeights(baseline);
  const evaluate=(examples:ReviewedExample[])=>{
    let correct=0;const recall:Record<string,{correct:number;total:number;predicted:number}>={};
    const confusion:Record<string,Record<string,number>>={};
    for(const sample of examples){const predicted=model.predict(model.vectorize(sample.event)).predictedClass,match=predicted===sample.label;
      correct+=Number(match);recall[sample.label]??={correct:0,total:0,predicted:0};recall[predicted]??={correct:0,total:0,predicted:0};
      recall[sample.label].correct+=Number(match);recall[sample.label].total++;recall[predicted].predicted++;
      confusion[sample.label]??={};confusion[sample.label][predicted]=(confusion[sample.label][predicted]||0)+1;}
    const perClass=Object.fromEntries(Object.entries(recall).map(([label,r])=>{
      const precision=r.predicted?r.correct/r.predicted:0,recall=r.total?r.correct/r.total:0;
      return [label,{precision,recall,f1:precision+recall?2*precision*recall/(precision+recall):0,support:r.total}];
    }));
    const supported=Object.values(perClass).filter(r=>r.support>0);
    return {accuracy:correct/examples.length,macroRecall:supported.reduce((sum,r)=>sum+r.recall,0)/supported.length,
      macroF1:supported.reduce((sum,r)=>sum+r.f1,0)/supported.length,perClass,confusion,samples:examples.length};
  };
  const before={validation:evaluate(partitions.validation),test:evaluate(partitions.test)};
  for(let epoch=0;epoch<5;epoch++)for(const sample of partitions.train)model.trainSample(model.vectorize(sample.event),sample.label,0.005);
  const after={validation:evaluate(partitions.validation),test:evaluate(partitions.test)};
  const eligible=Object.values(after).every(result=>result.accuracy>=0.8&&result.macroRecall>=0.8)&&
    after.validation.accuracy>=before.validation.accuracy&&after.test.accuracy>=before.test.accuracy;
  return {weights:model.exportWeights(),eligible,metrics:{before,after,epochs:5,
    limitation:'Reviewed partition labels are trusted provenance. These dataset scores do not establish general production accuracy; repeated holdout reuse can bias selection.'}};
}
