export interface BudgetMessage {role:'system'|'user'|'assistant';content:string}
/** Extractive history compaction; instructions and the current request remain intact. */
export function compactMessages<T extends BudgetMessage>(messages:T[],budget=2000000):T[] {
  if(!Number.isInteger(budget)||budget<1024||budget>10000000)throw new Error('Invalid model context character budget');
  if(messages.reduce((sum,m)=>sum+m.content.length,0)<=budget)return messages;
  const required=new Set(messages.map((m,i)=>m.role==='system'||i===messages.length-1?i:-1));
  let remaining=budget-messages.reduce((sum,m,i)=>sum+(required.has(i)?m.content.length:0),0);
  if(remaining<0)throw new Error('Current request and instructions exceed context budget; narrow the request.');
  const result:T[]=[];
  for(let i=messages.length-1;i>=0;i--){
    const m=messages[i];if(required.has(i)){result.unshift(m);continue;}
    if(m.content.length<=remaining){result.unshift(m);remaining-=m.content.length;continue;}
    const marker='\n[Earlier context omitted to fit the request budget]\n';
    if(remaining>=marker.length+128){const available=remaining-marker.length;const head=Math.floor(available/2);
      result.unshift({...m,content:m.content.slice(0,head)+marker+m.content.slice(-(available-head))});remaining=0;}
  }
  return result;
}
