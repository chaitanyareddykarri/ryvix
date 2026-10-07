'use client';
import {useEffect,useState} from 'react';
export default function TeamPage(){
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [email,setEmail]=useState(''),[role,setRole]=useState('viewer'),[sendEmail,setSendEmail]=useState(false),[token,setToken]=useState(''),[inviteLink,setInviteLink]=useState(''),[selectedOrg,setOrg]=useState(''),[edits,setEdits]=useState<Record<string,string>>({});
 async function load(signal?:AbortSignal){const r=await fetch('/api/team',{signal,cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error||'Team unavailable.');if(!signal?.aborted){setData(d);setOrg(d.organizationId||'');setEdits({});}}
 useEffect(()=>{const fragment=new URLSearchParams(window.location.hash.slice(1));setToken(fragment.get('invite')||'');if(fragment.has('invite'))window.history.replaceState(null,'',window.location.pathname+window.location.search);const c=new AbortController();void load(c.signal).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
 async function mutate(body:any){if(busy)return;setBusy(true);setError('');setNotice('');try{
  const r=await fetch('/api/team',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw new Error(d.error||'Team update unavailable.');
  if(body.action==='invite'){setInviteLink(`${window.location.origin}/team#invite=${d.token}`);setNotice(d.delivery==='accepted'?'Invitation created; email accepted for delivery.':d.delivery==='unknown'?'Invitation created. Email delivery is uncertain; use the link below.':'Invitation created. Share the link with the invited person.');}
  else{setNotice(body.action==='accept'?'Invitation accepted. This organization is now active.':'Team updated.');if(body.action==='accept')setToken('');}
  await load();
 }catch(e){setError(e instanceof Error?e.message:'Team update unavailable.');}finally{setBusy(false);}}
 const admin=['owner','admin'].includes(data?.currentRole);
 return <main style={{maxWidth:960,margin:'auto',padding:24}}><h1>Team and organizations</h1>
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <section><h2>Accept invitation</h2><p>Sign in with the verified email addressed by the invitation. Acceptance switches your active organization.</p>
   <form onSubmit={e=>{e.preventDefault();void mutate({action:'accept',token});}}><label>Invitation token<input autoComplete="off" value={token} maxLength={64} pattern="[a-f0-9]{64}" required onChange={e=>setToken(e.target.value)}/></label><button disabled={busy}>Accept invitation</button></form>
  </section>
  {data&&<>
   <form onSubmit={e=>{e.preventDefault();void mutate({action:'switch',organizationId:selectedOrg});}}><label>Active organization<select value={selectedOrg} onChange={e=>setOrg(e.target.value)} required><option value="">Select organization</option>{data.memberships.map((m:any)=><option key={m.organization_id} value={m.organization_id}>{m.name}</option>)}</select></label><button disabled={busy||!selectedOrg||selectedOrg===data.organizationId}>Switch organization</button></form>
   {admin&&<section><h2>Invite member</h2><form onSubmit={e=>{e.preventDefault();setInviteLink('');void mutate({action:'invite',email,role,sendEmail});}}>
    <label>Email<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label>Invitation role<select value={role} onChange={e=>setRole(e.target.value)}><option value="viewer">Viewer</option><option value="developer">Developer</option>{data.currentRole==='owner'&&<option value="admin">Admin</option>}</select></label>
    <label><input type="checkbox" checked={sendEmail} onChange={e=>setSendEmail(e.target.checked)}/> Send invitation email</label><button disabled={busy}>Create invitation</button>
   </form>{inviteLink&&<label>Invitation link (shown once)<input readOnly value={inviteLink} style={{width:'100%'}}/></label>}</section>}
   <section><h2>Members</h2>{data.members.map((member:any)=>{
    const canEdit=admin&&member.user_id!==data.currentUserId&&(data.currentRole==='owner'||!['owner','admin'].includes(member.role));
    return <article key={member.id} style={{padding:16,border:'1px solid #475569',borderRadius:10,marginTop:12}}><h3>{member.full_name||member.email}</h3><p>{member.email} · {member.role}{member.user_id===data.currentUserId?' (you)':''}</p>
     {canEdit&&<><label>Role for {member.email}<select value={edits[member.id]||member.role} onChange={e=>setEdits({...edits,[member.id]:e.target.value})}>{(data.currentRole==='owner'?['owner','admin','developer','viewer']:['developer','viewer']).map(r=><option key={r}>{r}</option>)}</select></label>
      <button disabled={busy||!edits[member.id]||edits[member.id]===member.role} onClick={()=>{if(window.confirm(`Change ${member.email} to ${edits[member.id]}?`))void mutate({action:'role',id:member.id,expectedRole:member.role,role:edits[member.id]});}}>Save role</button>
      <button disabled={busy} onClick={()=>{if(window.confirm(`Remove ${member.email} from this organization?`))void mutate({action:'remove',id:member.id,expectedRole:member.role});}}>Remove member</button></>}
    </article>;
   })}</section>
   {admin&&<section><h2>Invitations</h2>{data.invitations.map((i:any)=><article key={i.id}><p>{i.email} · {i.role} · {i.accepted_at?'Accepted':i.revoked_at?'Revoked':new Date(i.expires_at).getTime()<=Date.now()?'Expired':'Pending'} · Expires {new Date(i.expires_at).toLocaleString()}</p>
    {!i.accepted_at&&!i.revoked_at&&<button disabled={busy} onClick={()=>{if(window.confirm(`Revoke invitation for ${i.email}?`))void mutate({action:'revoke_invite',id:i.id});}}>Revoke invitation</button>}</article>)}</section>}
  </>}
 </main>;
}
