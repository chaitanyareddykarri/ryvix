import {posix} from 'node:path';
export interface RepositorySource {path:string;content:string;}
export interface DependencyEdge {source:string;target:string;kind:'static-reference';}
/** Conservative text references, not compiler-resolved symbols or runtime edges. */
export function repositoryDependencies(files:RepositorySource[]):DependencyEdge[]{
  const paths=new Set(files.map(f=>f.path)),edges:DependencyEdge[]=[],seen=new Set<string>();
  const namespaces=new Map<string,string[]>();
  for(const file of files){
    const match=file.content.match(/\b(?:package|namespace)\s+([\w.\\]+)\s*[;{]/);
    if(match)namespaces.set(match[1],[...(namespaces.get(match[1])||[]),file.path]);
  }
  const module=files.find(f=>f.path==='go.mod')?.content.match(/^module\s+(\S+)/m)?.[1];
  const add=(source:string,target:string)=>{const key=source+'\0'+target;if(source!==target&&paths.has(target)&&!seen.has(key)&&edges.length<1000){seen.add(key);edges.push({source,target,kind:'static-reference'});}};
  for(const file of files){
    const refs:string[]=[];
    const collect=(pattern:RegExp,transform:(s:string)=>string=s=>s)=>{for(const match of file.content.matchAll(pattern))refs.push(transform(match[1]));};
    if(/\.[cm]?[jt]sx?$/.test(file.path))collect(/(?:from\s*|import\s*\(|require\s*\(|import\s*)['"](\.[^'"\n]+)['"]/g);
    if(/\.py$/.test(file.path)){
      collect(/^\s*from\s+([.\w]+)\s+import/gm,s=>s.startsWith('.')?'.'+'/../'.repeat(Math.max(0,(s.match(/^\.+/)?.[0].length||1)-1))+'/'+s.replace(/^\.+/,'').replace(/\./g,'/'):'/'+s.replace(/\./g,'/'));
      collect(/^\s*import\s+([\w.]+)/gm,s=>'/'+s.replace(/\./g,'/'));
    }
    if(/\.rs$/.test(file.path)){
      collect(/\bmod\s+(\w+)\s*;/g,s=>'./'+s);
      collect(/\buse\s+crate::([\w:]+)/g,s=>'/src/'+s.replace(/::/g,'/'));
    }
    if(/\.(c|cc|cpp|h|hpp)$/.test(file.path))collect(/^\s*#\s*include\s*"([^"\n]+)"/gm,s=>'./'+s);
    if(/\.rb$/.test(file.path))collect(/\brequire_relative\s*['"]([^'"\n]+)['"]/g,s=>'./'+s);
    if(/\.(java|cs|php)$/.test(file.path)){
      for(const match of file.content.matchAll(/\b(?:import|using|use)\s+([\w.\\]+)\s*;/g)){
        for(const target of namespaces.get(match[1])||[])add(file.path,target);
        const qualified=match[1].replace(/[.\\]/g,'/');
        for(const target of paths)if(target.endsWith('/'+qualified+'.java')||target===qualified+'.java')add(file.path,target);
      }
    }
    if(/\.go$/.test(file.path)&&module){
      for(const match of file.content.matchAll(/"([^"\n]+)"/g))if(match[1].startsWith(module+'/')){
        const directory=match[1].slice(module.length+1);for(const target of paths)if(posix.dirname(target)===directory&&target.endsWith('.go'))add(file.path,target);
      }
    }
    for(const reference of refs){
      const base=posix.normalize(reference.startsWith('/')?reference.slice(1):posix.join(posix.dirname(file.path),reference));
      if(base.startsWith('../')||base.includes('\\'))continue;
      const candidates=[base,...['.ts','.tsx','.js','.jsx','.py','/__init__.py','.rs','/mod.rs','.rb','/index.ts','/index.tsx','/index.js'].map(ext=>base+ext)];
      for(const target of candidates)if(paths.has(target)){add(file.path,target);break;}
    }
  }
  return edges;
}
