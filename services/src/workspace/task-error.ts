import {ModelUnavailableError} from '../../../ai/src/provider-errors';
import {ModelQuotaError} from '../../../ai/src/model-capacity';
export function publicTaskError(error:unknown){
  if(error instanceof ModelUnavailableError||error instanceof ModelQuotaError)return error.message.slice(0,1000);
  const safe=new Set(['Worker lease lost','AI returned invalid code changes. No files were applied.','AI returned an incomplete change plan','Requested change is outside the reviewed context','Model request cancelled']);
  return error instanceof Error&&safe.has(error.message)?error.message:'Workspace execution stopped. Check the recorded stage history and worker configuration. No changes were shipped.';
}
