export type TaskStage='analysis'|'workspace'|'context'|'planning'|'editing'|'install'|'test'|'typecheck'|'lint'|'build'|'repair'|'diff'|'preview';
export interface TaskProgress {stage:TaskStage;status:'running'|'passed'|'failed'|'skipped';attempt:number;detail?:string;exitCode?:number;durationMs?:number;}
export type ProgressObserver=(event:TaskProgress)=>Promise<void>;
export function taskProgress(observer?:ProgressObserver){
  return {
    emit:async(event:TaskProgress)=>{await observer?.(event);},
    run:async<T>(stage:TaskStage,attempt:number,work:()=>Promise<T>,detail?:string):Promise<T>=>{
      await observer?.({stage,status:'running',attempt,detail});
      const started=Date.now();
      let result:T;
      try{result=await work();}catch(error){await observer?.({stage,status:'failed',attempt,durationMs:Date.now()-started});throw error;}
      await observer?.({stage,status:'passed',attempt,durationMs:Date.now()-started,detail});return result;
    },
  };
}
