export interface UsageTotal {provider:string;model:string;promptTokens:number|null;completionTokens:number|null;requests:number;}
/** Compare matching exports. Unknown counts and differing scopes never become a match. */
export function reconcileUsage(local:UsageTotal[],provider:UsageTotal[],scope:{localAccount:string;providerAccount:string;localStart:string;providerStart:string;localEnd:string;providerEnd:string}) {
  if(!scope.localAccount||scope.localAccount!==scope.providerAccount||scope.localStart!==scope.providerStart||scope.localEnd!==scope.providerEnd||
    !Number.isFinite(Date.parse(scope.localStart))||!Number.isFinite(Date.parse(scope.localEnd))||Date.parse(scope.localStart)>=Date.parse(scope.localEnd))throw new Error('Matching account and exact time window required');
  const aggregate=(rows:UsageTotal[])=>{
    if(!Array.isArray(rows)||rows.length>10000)throw new Error('Bounded usage export required');
    const groups=new Map<string,UsageTotal>();
    for(const row of rows){
      if(!row||typeof row.provider!=='string'||!row.provider||row.provider.length>100||typeof row.model!=='string'||!row.model||row.model.length>200||
        !Number.isSafeInteger(row.requests)||row.requests<0||[row.promptTokens,row.completionTokens].some(n=>n!==null&&(!Number.isSafeInteger(n)||n<0)))throw new Error('Invalid usage totals');
      const key=JSON.stringify([row.provider,row.model]),previous=groups.get(key);
      const sum=(a:number|null,b:number|null)=>a===null||b===null?null:a+b;
      const next=previous?{...row,requests:previous.requests+row.requests,promptTokens:sum(previous.promptTokens,row.promptTokens),completionTokens:sum(previous.completionTokens,row.completionTokens)}:{...row};
      if([next.requests,next.promptTokens,next.completionTokens].some(n=>n!==null&&!Number.isSafeInteger(n)))throw new Error('Usage totals exceed safe range');
      groups.set(key,next);
    }return groups;
  };
  const a=aggregate(local),b=aggregate(provider);
  return [...new Set([...a.keys(),...b.keys()])].sort().map(key=>{
    const left=a.get(key),right=b.get(key);const identity=left||right!;
    const known=!!left&&!!right&&[left.promptTokens,left.completionTokens,right.promptTokens,right.completionTokens].every(n=>n!==null);
    return {provider:identity.provider,model:identity.model,local:left??null,reported:right??null,
      status:!known?'unknown':left!.requests===right!.requests&&left!.promptTokens===right!.promptTokens&&left!.completionTokens===right!.completionTokens?'matched':'mismatch',
      promptDelta:known?left!.promptTokens!-right!.promptTokens!:null,completionDelta:known?left!.completionTokens!-right!.completionTokens!:null};
  });
}
