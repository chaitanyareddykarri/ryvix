import {NextResponse} from 'next/server';
import {requireTenant,requireOperator,RequestError} from '@/utils/tenant-context';
import {getDirectDbPool} from '@/utils/direct-db';
import {githubTokenForProject} from '@/utils/github-credentials';
import {collectStaticPreview} from '@/utils/static-preview';
export async function GET(_request:Request,context:{params:Promise<{taskId:string}>}) {
  try {
    const {user,organizationId,role}=await requireTenant();requireOperator(role);
    const {taskId}=await context.params;
    if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(taskId)) throw new RequestError('Invalid task.',400);
    const result=await getDirectDbPool().query(`SELECT a.files,a.base_commit_sha,r.full_name,t.project_id FROM tasks t
      JOIN projects p ON p.id=t.project_id JOIN organization_members m ON m.organization_id=p.organization_id
      JOIN task_artifacts a ON a.task_id=t.id JOIN repositories r ON r.id=a.repository_id AND r.project_id=t.project_id
      WHERE t.id=$1 AND p.organization_id=$2 AND m.user_id=$3 AND m.role IN ('owner','admin','developer')`,[taskId,organizationId,user.id]);
    const artifact=result.rows[0];
    if(!artifact) throw new RequestError('No saved changes available for this task.',404);
    if(!/^[a-f0-9]{40}$/i.test(artifact.base_commit_sha)||!/^[-\w.]+\/[-\w.]+$/.test(artifact.full_name)) throw new RequestError('Invalid repository snapshot.',409);
    const token=await githubTokenForProject(artifact.project_id,organizationId,user.id);
    const signal=AbortSignal.timeout(20000);
    const files=await collectStaticPreview(artifact.files,async path=>{
      const response=await fetch(`https://api.github.com/repos/${artifact.full_name}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${artifact.base_commit_sha}`,{
        headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'},cache:'no-store',redirect:'error',signal});
      if(!response.ok) throw new RequestError('Repository files unavailable. Check the GitHub connection.',409);
      if(Number(response.headers.get('content-length'))>500000) throw new RequestError('Static file too large.',422);
      // Bound the body even when Content-Length is absent.
      const reader=response.body!.getReader();const chunks:Uint8Array[]=[];let size=0;
      try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>500000)throw new RequestError('Static file too large.',422);chunks.push(value);}}finally{await reader.cancel();}
      const file=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(file.type!=='file'||file.encoding!=='base64'||file.size>300000) throw new RequestError('Unsupported static file.',422);
      return Buffer.from(file.content,'base64').toString('utf8');
    });
    return NextResponse.json({files},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return NextResponse.json({error:error instanceof RequestError?error.message:'Static preview unavailable. This mode needs a root index.html and local CSS/JavaScript; framework builds require a running preview server.'},{status:error instanceof RequestError?error.status:422,headers:{'Cache-Control':'no-store'}});}
}
