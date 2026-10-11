"use client";
const labels:Record<string,string>={analysis:'Stack analysis',workspace:'Isolated workspace',context:'Source inspection',planning:'Change plan',editing:'Apply code changes',install:'Install dependencies',test:'Tests / static checks',typecheck:'Type check',lint:'Lint',build:'Build',repair:'Bounded repair',diff:'Reviewable diff',preview:'Preview startup'};
export default function TaskCheckTimeline({events=[],status,unavailable=false,truncated=false}:{events?:Array<{stage:string;status:string;attempt:number;at?:string;detail?:string;exitCode?:number;durationMs?:number}>;status:string;unavailable?:boolean;truncated?:boolean}){
  return <section aria-label="Recorded task checks" style={{padding:'1rem',border:'1px solid #334155',borderRadius:10,marginBlock:16}}>
    <h3>Analysis, review and check history</h3>
    <p>Recorded worker events. One repair at most per execution; configured checks rerun after a correction. A passing check is not proof that every source-code loop terminates.</p>
    {unavailable?<p role="alert">Check history is unavailable. Retry later.</p>:!events.length?<p>No execution checks recorded yet. Older workers do not publish this history.</p>:<ol style={{maxHeight:240,overflowY:"auto",paddingInlineStart:24}}>
      {events.map((event,index)=>{
        const interrupted=event.status==='running'&&['failed','cancelled'].includes(status)&&!events.slice(index+1).some(next=>next.stage===event.stage&&next.attempt===event.attempt&&next.status!=='running');
        return <li key={index} style={{marginBlock:8,overflowWrap:'anywhere'}}>
          <strong>{labels[event.stage]||'Worker check'}</strong> · Attempt {event.attempt} · {interrupted?'Interrupted / no completion recorded':event.status}
          {event.exitCode!==undefined&&` · exit ${event.exitCode}`}{event.durationMs!==undefined&&` · ${event.durationMs} ms`}
          {event.detail&&<div>{event.detail}</div>}{event.at&&<small>{new Date(event.at).toLocaleString()}</small>}
        </li>;
      })}
    </ol>}
    {truncated&&<p>History response reached its limit; some events may be omitted.</p>}
    <p>Human code review and approval remain required before shipping. Missing tests and unsupported checks are not passes.</p>
  </section>;
}
