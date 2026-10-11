/** Static snapshots never execute customer code on the application server. */
export type SnapshotFiles = Record<string, string>;
export function previewPath(value: string): string | null {
  if (!value || /[?#\\\x00-\x20]/.test(value) || value.startsWith('//') || /^[a-z]+:/i.test(value)) return null;
  const path=value.replace(/^\//,'').replace(/^\.\//,'');
  return path.split('/').every(part=>part && part!=='.' && part!=='..') && /\.(html|css|js)$/i.test(path) ? path : null;
}
export async function collectStaticPreview(changes: {filename:string;action:string;content?:string}[], load:(path:string)=>Promise<string|null>):Promise<SnapshotFiles> {
  const files:SnapshotFiles=Object.create(null);let total=0;
  const pending=['index.html'];
  for(let i=0;i<pending.length;i++) {
    if(i>=20) throw Error('Static preview supports up to 20 linked files.');
    const path=pending[i];const change=changes.find(file=>file.filename===path);
    const content=change ? change.action==='delete' ? null : change.content : await load(path);
    if(typeof content!=='string') throw Error('A required static preview file is unavailable.');
    total+=new TextEncoder().encode(content).length;
    if(content.length>300000 || total>1500000) throw Error('Static preview exceeds its size limit.');
    files[path]=content;
    if(path==='index.html') for(const match of content.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
      const dependency=previewPath(match[1]);
      if(dependency && !pending.includes(dependency)) pending.push(dependency);
    }
  }
  return files;
}
/** Called only in the browser. Opaque-origin iframe plus CSP contains untrusted code. */
export function staticPreviewDocument(files:SnapshotFiles):string {
  const doc=new DOMParser().parseFromString(files['index.html'],'text/html');
  doc.querySelectorAll('base,meta[http-equiv],iframe,object,embed').forEach(node=>node.remove());
  const data=(type:string,value:string)=>'data:'+type+';base64,'+btoa(Array.from(new TextEncoder().encode(value),byte=>String.fromCharCode(byte)).join(''));
  doc.querySelectorAll('link[href]').forEach(node=>{
    const path=previewPath(node.getAttribute('href')||'');
    if(node.getAttribute('rel')==='stylesheet' && path && files[path]!==undefined) node.setAttribute('href',data('text/css',files[path]));
    else node.remove();
  });
  doc.querySelectorAll('script[src]').forEach(node=>{
    const path=previewPath(node.getAttribute('src')||'');
    if(path && files[path]!==undefined) {node.setAttribute('src',data('text/javascript',files[path]));node.removeAttribute('integrity');node.removeAttribute('crossorigin');}
    else node.remove();
  });
  const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';
  policy.content="default-src 'none'; script-src 'unsafe-inline' data:; style-src 'unsafe-inline' data:; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-src 'none'; object-src 'none'";
  doc.head.prepend(policy);
  return '<!doctype html>'+doc.documentElement.outerHTML;
}
