import {ContextBuilder} from './context-builder';

/** Include complete files only: editing a truncated file can destroy its omitted tail. */
export function boundedRepositoryFiles(files:Array<{path:string;content:string}>,budget:number){
  if(!Number.isInteger(budget)||budget<1024||budget>10000000)throw new Error('Invalid model context character budget');
  const available=Math.max(0,budget-16000);
  const result:Array<{path:string;content:string}>=[];
  let used=2;
  for(const file of files){
    const safe={path:file.path,content:ContextBuilder.sanitizeText(file.content)};
    const size=JSON.stringify(safe).length+1;
    if(used+size>available)continue;
    result.push(safe);used+=size;
  }
  if(!result.length)throw new Error('No complete source file fits the model context budget; narrow the task or configure an appropriate budget.');
  return result;
}
