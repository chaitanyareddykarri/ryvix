export interface CheckResult {success:boolean;exitCode:number;durationMs:number;stdout:string;stderr:string;}
export interface CheckRecord {command:string;success:boolean;exitCode:number;durationMs:number;
  previousAttempts?:Array<{success:boolean;exitCode:number;durationMs:number}>;}

/** One correction at most; a second failure never becomes a completed task. */
export async function verifyWithOneRepair(commands:string[],run:(command:string)=>Promise<CheckResult>,
  repair:(command:string,result:CheckResult)=>Promise<void>):Promise<CheckRecord[]> {
  const previous=new Map<string,CheckRecord>();
  for(let attempt=0;attempt<2;attempt++){
    const records:CheckRecord[]=[];let failure:{command:string;result:CheckResult}|undefined;
    for(const command of commands){
      const result=await run(command);
      const record:CheckRecord={command,success:result.success,exitCode:result.exitCode,durationMs:result.durationMs};
      const prior=previous.get(command);
      if(prior)record.previousAttempts=[{success:prior.success,exitCode:prior.exitCode,durationMs:prior.durationMs}];
      records.push(record);
      if(!result.success){failure={command,result};break;}
    }
    if(!failure)return records;
    if(attempt===1)throw new Error('Sandbox verification failed after one bounded repair; no changes shipped.');
    for(const record of records)previous.set(record.command,record);
    await repair(failure.command,failure.result);
  }
  throw new Error('Verification unavailable');
}
