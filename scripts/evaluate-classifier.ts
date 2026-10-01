import fs from 'node:fs';
import { neuralThreatClassifier, neuralWeightsStatus, NEURAL_THREAT_CLASSES } from '../ai/src/neural-network';

try {
  const file=process.argv[2];
  if (!file) throw new Error('Provide a JSON file of held-out labeled samples');
  if (!neuralWeightsStatus.loaded) throw new Error('Validated saved weights required');
  const samples=JSON.parse(fs.readFileSync(file,'utf8'));
  if (!Array.isArray(samples) || !samples.length || samples.length>10000) throw new Error('Invalid dataset');
  const confusion: Record<string,Record<string,number>>={};
  let correct=0;
  for (const sample of samples) {
    if (!NEURAL_THREAT_CLASSES.includes(sample.label) || !sample.event || typeof sample.event!=='object') throw new Error('Invalid label or event');
    const predicted=neuralThreatClassifier.predict(neuralThreatClassifier.vectorize(sample.event)).predictedClass;
    if (predicted===sample.label) correct++;
    confusion[sample.label] ||= {};
    confusion[sample.label][predicted]=(confusion[sample.label][predicted] || 0)+1;
  }
  const labels = [...new Set([...Object.keys(confusion),...Object.values(confusion).flatMap(row=>Object.keys(row))])];
  const perClass = Object.fromEntries(labels.map(label=>{
    const tp=confusion[label]?.[label] || 0;
    const predicted=Object.values(confusion).reduce((sum,row)=>sum+(row[label] || 0),0);
    const actual=Object.values(confusion[label] || {}).reduce((sum,n)=>sum+n,0);
    return [label,{precision:predicted ? tp/predicted : null,recall:actual ? tp/actual : null,
      f1:predicted+actual ? 2*tp/(predicted+actual) : null,support:actual}];
  }));
  console.log(JSON.stringify({samples:samples.length,correct,accuracy:correct/samples.length,confusion,perClass,
    limitation:'Caller must establish that samples are real, representative and unseen during training. No training is performed.'},null,2));
} catch { console.error('Classifier evaluation unavailable: provide valid held-out labeled events and compatible saved weights.');process.exitCode=1; }
