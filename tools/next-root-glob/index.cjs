// Narrow adapter for Next 15.1.7 getRootDirs only, not a general fast-glob substitute.
const {globSync}=require('tinyglobby');
exports.globSync=function(pattern,options){
  if(typeof pattern!=='string'||pattern.length>4096||!options||options.onlyDirectories!==true||Object.keys(options).some(key=>key!=='onlyDirectories'))throw new Error('Unsupported Next root-directory glob contract');
  let depth=0;
  for(let i=0;i<pattern.length;i++){
    if(pattern[i]==='\\'){i++;continue;}
    if('{[('.includes(pattern[i])&&++depth>32)throw new Error('Root-directory glob nesting exceeds limit');
    if('}])'.includes(pattern[i]))depth=Math.max(0,depth-1);
  }
  return globSync(pattern,{onlyDirectories:true,expandDirectories:false,absolute:require('node:path').isAbsolute(pattern)}).map(dir=>dir.replace(/\/$/,'')||'/');
};
