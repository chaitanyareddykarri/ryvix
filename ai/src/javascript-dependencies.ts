import ts from 'typescript';
import {posix} from 'node:path';
type Source={path:string;content:string};
/** Parse syntax without executing code or accessing files outside the supplied snapshot. */
export function javascriptReferences(file:Source,files:Source[]):string[]{
  if(!file.content||file.content.length>32768)return [];
  const source=ts.createSourceFile(file.path,file.content,ts.ScriptTarget.Latest,false);
  const imports=new Set<string>(),stack:ts.Node[]=[source];let visited=0;
  while(stack.length&&visited++<20000){const node=stack.pop()!;
    if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteralLike(node.moduleSpecifier))imports.add(node.moduleSpecifier.text);
    if(ts.isImportEqualsDeclaration(node)&&ts.isExternalModuleReference(node.moduleReference)&&node.moduleReference.expression&&ts.isStringLiteralLike(node.moduleReference.expression))imports.add(node.moduleReference.expression.text);
    if(ts.isCallExpression(node)&&node.arguments.length===1&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(node.expression)&&node.expression.text==='require'))&&ts.isStringLiteralLike(node.arguments[0]))imports.add(node.arguments[0].text);
    ts.forEachChild(node,child=>{stack.push(child);});
  }
  const config=files.filter(f=>/(^|\/)(tsconfig|jsconfig)\.json$/.test(f.path)&&f.content.length<=32768)
    .filter(f=>posix.dirname(f.path)==='.'||file.path.startsWith(posix.dirname(f.path)+'/'))
    .sort((a,b)=>b.path.length-a.path.length)[0];
  let options:ts.CompilerOptions|undefined,root='.';
  if(config){
    // Resolve inherited configuration only within this bounded repository snapshot.
    const snapshot=new Map(files.filter(f=>f.content.length<=32768&&!f.path.startsWith('/')&&!f.path.includes('\\')&&!f.path.split('/').includes('..')).map(f=>['/'+f.path,f.content]));
    let reads=0;
    const parsed=ts.getParsedCommandLineOfConfigFile('/'+config.path,{}, {
      useCaseSensitiveFileNames:true,getCurrentDirectory:()=> '/',
      readDirectory:()=>[],fileExists:path=>snapshot.has(path),
      readFile:path=>++reads<=64?snapshot.get(path):undefined,
      onUnRecoverableConfigFileDiagnostic:()=>{},
    });
    // TS18003 is expected: this host deliberately never enumerates source files.
    if(parsed&&!parsed.errors.some(e=>e.code!==18003)){
      options=parsed.options;
      root=String(options.baseUrl||(options as any).pathsBasePath||posix.dirname('/'+config.path));
    }
  }
  const references:string[]=[];
  for(const specifier of imports){
    if(specifier.length>512)continue;
    if(specifier.startsWith('.')){references.push(specifier);continue;}
    if(!options||specifier.length>512||specifier.includes('\\')||specifier.startsWith('/'))continue;
    const base='.';
    for(const [pattern,targets] of Object.entries(options.paths||{}).slice(0,100)){
      if(pattern.split('*').length>2||!Array.isArray(targets))continue;
      const [prefix,suffix='']=pattern.split('*');
      if(pattern.includes('*')?!(specifier.startsWith(prefix)&&specifier.endsWith(suffix)&&specifier.length>=prefix.length+suffix.length):specifier!==pattern)continue;
      const middle=pattern.includes('*')?specifier.slice(prefix.length,suffix? -suffix.length:undefined):'';
      for(const target of targets.slice(0,10))if(typeof target==='string'&&!target.startsWith('/')&&!target.includes('\\'))references.push(posix.join(root,base,target.replace('*',middle)));
    }
    if(typeof options.baseUrl==='string')references.push(posix.join(root,base,specifier));
  }
  return references.slice(0,200);
}
