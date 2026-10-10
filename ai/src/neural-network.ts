// Legacy singleton entry point for offline experiments; web imports neural-classifier.
export * from './neural-classifier';
import {NeuralThreatClassifier} from './neural-classifier';
import {allowLegacyWeightFile} from './offline-boundary';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
export const neuralThreatClassifier = new NeuralThreatClassifier();
export const neuralWeightsStatus: { loaded: boolean; reason: string } = { loaded:false, reason:'Saved weights unavailable' };
// A literal production guard also lets Next remove legacy file paths from its trace.
if (process.env.NODE_ENV !== 'production') { try {
  if (!allowLegacyWeightFile()) throw new Error('Offline weights are disabled in production');
  const candidates = process.env.RYVIX_NEURAL_WEIGHTS_PATH ? [process.env.RYVIX_NEURAL_WEIGHTS_PATH] :
    [resolve(process.cwd(),'ai/data/neural_weights.json'),resolve(process.cwd(),'../ai/data/neural_weights.json')];
  const filename = candidates.find(value => existsSync(value));
  if (filename) {
    if (statSync(filename).size > 8*1024*1024) throw new Error('Weight file too large');
    neuralThreatClassifier.loadWeights(JSON.parse(readFileSync(filename,'utf8')));
    neuralWeightsStatus.loaded = true; neuralWeightsStatus.reason = 'Validated saved classifier weights loaded';
  }
} catch { neuralWeightsStatus.reason = allowLegacyWeightFile() ? 'Saved weights rejected: invalid or incompatible' : 'Offline weights disabled in production; use reviewed project checkpoints'; }
} else { neuralWeightsStatus.reason = 'Offline weights disabled in production; use reviewed project checkpoints'; }
