import {repositoryDependencies} from '../../../ai/src/repository-dependencies';
export interface ContextEntry {path:string;size:number;}
const allowed=(file:ContextEntry)=>Number.isFinite(file.size)&&file.size>=0&&file.size<=32000 &&
  !file.path.startsWith('/')&&!file.path.split('/').includes('..')&&!file.path.includes('\\')&&
  (/\.(tsx?|jsx?|py|go|rs|cs|java|php|rb|c|cc|cpp|h|hpp|css|html|md)$/.test(file.path)||file.path==='go.mod')&&
  !/(^|\/)(node_modules|vendor|dist|build|\.git|secrets?|credentials?)(\/|\.)/i.test(file.path);

/** Bounded source context: ranked paths, then local imports of those sources. */
export async function repositoryContext(entries:ContextEntry[],prompt:string,read:(path:string)=>Promise<string|null>){
  const eligible=entries.filter(allowed),byPath=new Map(eligible.map(f=>[f.path,f]));
  const terms=prompt.toLowerCase().split(/\W+/).filter(t=>t.length>3);
  const ranked=eligible.sort((a,b)=>terms.filter(t=>b.path.toLowerCase().includes(t)).length-
    terms.filter(t=>a.path.toLowerCase().includes(t)).length||a.path.localeCompare(b.path));
  const queue=ranked.slice(0,10).map(f=>f.path),seen=new Set<string>();
  if(byPath.has('go.mod')&&!queue.includes('go.mod'))queue.unshift('go.mod');
  const files:Array<{path:string;content:string}>=[];let bytes=0;
  for(let index=0;index<queue.length&&files.length<24;index++){
    const path=queue[index];if(seen.has(path))continue;seen.add(path);
    const entry=byPath.get(path);if(!entry||bytes+entry.size>160000)continue;
    const content=await read(path);if(content===null)continue;
    const size=Buffer.byteLength(content);if(size>32000||bytes+size>160000)continue;
    files.push({path,content});bytes+=size;
    const known=new Map(files.map(f=>[f.path,f.content]));
    // Include only paths here; unavailable file bodies cannot establish namespaces.
    const sources=eligible.slice(0,2000).map(f=>({path:f.path,content:known.get(f.path)||''}));
    for(const edge of repositoryDependencies(sources)){
      if(known.has(edge.source)&&!seen.has(edge.target)&&!queue.includes(edge.target)&&queue.length<200)queue.push(edge.target);
    }
  }
  return files;
}
