import {createHash,randomBytes} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
export class TeamError extends Error {constructor(message:string,readonly status:number){super(message);}}
const roles=['owner','admin','developer','viewer'];
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export class TeamStore{
 constructor(private readonly pool:Pool){}
 private async tx<T>(work:(c:PoolClient)=>Promise<T>){const c=await this.pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='15s'");const result=await work(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
 private async audit(c:PoolClient,org:string,user:string,action:string,target:string){await c.query('INSERT INTO organization_audit_events(organization_id,actor_id,action_name,parameters_hash) VALUES($1,$2,$3,$4)',[org,user,`team.${action}`,hash(target)]);}
 private async actor(c:PoolClient,org:string,user:string){
  await c.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[org]);
  const row=(await c.query('SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2 FOR UPDATE',[org,user])).rows[0];
  if(!row||!['owner','admin'].includes(row.role))throw new TeamError('Team administration requires owner or admin access.',403);return row.role as string;
 }
 async list(org:string,user:string){
  const membership=(await this.pool.query('SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2',[org,user])).rows[0];
  if(!membership)throw new TeamError('Organization access denied.',403);
  const members=(await this.pool.query(`SELECT m.id,m.user_id,m.role,p.full_name,u.email FROM organization_members m
   JOIN auth.users u ON u.id=m.user_id LEFT JOIN profiles p ON p.id=m.user_id WHERE m.organization_id=$1 ORDER BY m.created_at`,[org])).rows;
  const invitations=['owner','admin'].includes(membership.role)?(await this.pool.query(`SELECT id,email,role,expires_at,accepted_at,revoked_at FROM organization_invitations WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 100`,[org])).rows:[];
  return {members,invitations,currentRole:membership.role,currentUserId:user};
 }
 async invite(org:string,user:string,email:unknown,role:unknown){
  if(typeof email!=='string'||email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof role!=='string'||!['admin','developer','viewer'].includes(role))throw new TeamError('Valid email and invitation role required.',400);
  const normalized=email.toLowerCase(),token=randomBytes(32).toString('hex');
  return this.tx(async c=>{
   const actor=await this.actor(c,org,user);if(role==='admin'&&actor!=='owner')throw new TeamError('Only owners can invite administrators.',403);
   const budget=await c.query(`INSERT INTO chat_request_budgets(organization_id,subject,bucket,requests) VALUES($1,$2,date_trunc('hour',now()),1)
    ON CONFLICT(organization_id,subject,bucket) DO UPDATE SET requests=chat_request_budgets.requests+1 WHERE chat_request_budgets.requests<20 RETURNING requests`,[org,`team-invite:${user}`]);
   if(!budget.rows.length)throw new TeamError('Invitation limit reached. Retry next hour.',429);
   await c.query('UPDATE organization_invitations SET revoked_at=now() WHERE organization_id=$1 AND email=$2 AND accepted_at IS NULL AND revoked_at IS NULL',[org,normalized]);
   const invitation=(await c.query(`INSERT INTO organization_invitations(organization_id,invited_by,email,role,token_hash) VALUES($1,$2,$3,$4,$5) RETURNING id,email,role,expires_at`,[org,user,normalized,role,hash(token)])).rows[0];
   await this.audit(c,org,user,'invite',invitation.id);return {invitation,token};
  });
 }
 async accept(user:string,email:string|undefined,confirmed:boolean,token:unknown){
  if(!confirmed||!email)throw new TeamError('Verify your account email before accepting an invitation.',403);
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new TeamError('Valid invitation token required.',400);
  return this.tx(async c=>{
   // Find scope before taking locks, then recheck the exact invitation under the organization lock.
   const scope=(await c.query('SELECT organization_id FROM organization_invitations WHERE token_hash=$1',[hash(token)])).rows[0];
   if(!scope)throw new TeamError('Invitation unavailable.',404);
   await c.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE',[scope.organization_id]);
   const invite=(await c.query(`SELECT i.* FROM organization_invitations i JOIN organization_members m ON m.organization_id=i.organization_id AND m.user_id=i.invited_by
    WHERE i.token_hash=$1 AND i.organization_id=$2 AND i.email=$3 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>now()
    AND (m.role='owner' OR (m.role='admin' AND i.role IN ('developer','viewer'))) FOR UPDATE OF i FOR SHARE OF m`,[hash(token),scope.organization_id,email.toLowerCase()])).rows[0];
   if(!invite)throw new TeamError('Invitation expired, used, revoked, or not addressed to this account.',403);
   await c.query('INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(organization_id,user_id) DO NOTHING',[invite.organization_id,user,invite.role]);
   const updated=await c.query(`UPDATE profiles p SET organization_id=$1,role=m.role,updated_at=now() FROM organization_members m WHERE p.id=$2 AND m.organization_id=$1 AND m.user_id=$2 RETURNING p.id`,[invite.organization_id,user]);
   if(!updated.rows.length)throw new TeamError('Complete account registration first.',409);
   await c.query('UPDATE organization_invitations SET accepted_at=now() WHERE id=$1',[invite.id]);await this.audit(c,invite.organization_id,user,'accept',invite.id);
   return {accepted:true,organizationId:invite.organization_id};
  });
 }
 async mutate(org:string,user:string,body:Record<string,unknown>){
  if(!['role','remove','revoke_invite'].includes(String(body.action))||typeof body.id!=='string'||!uuid.test(body.id))throw new TeamError('Valid team action and target required.',400);
  if(body.action==='role'&&(typeof body.role!=='string'||!roles.includes(body.role)))throw new TeamError('Valid role required.',400);
  return this.tx(async c=>{
   const actor=await this.actor(c,org,user);
   if(body.action==='revoke_invite'){
    const result=await c.query(`UPDATE organization_invitations SET revoked_at=now() WHERE id=$1 AND organization_id=$2 AND accepted_at IS NULL AND revoked_at IS NULL AND ($3='owner' OR role IN ('developer','viewer')) RETURNING id`,[body.id,org,actor]);
    if(!result.rows.length)throw new TeamError('Invitation unavailable.',404);
   }else{
    const target=(await c.query('SELECT user_id,role FROM organization_members WHERE id=$1 AND organization_id=$2 FOR UPDATE',[body.id,org])).rows[0];
    if(!target)throw new TeamError('Member unavailable.',404);
    if(body.expectedRole!==target.role)throw new TeamError('Member role changed; refresh before continuing.',409);
    if(target.user_id===user)throw new TeamError('Ask another owner to change your membership.',409);
    if(actor!=='owner'&&(['owner','admin'].includes(target.role)||['owner','admin'].includes(String(body.role))))throw new TeamError('Only owners can manage privileged members.',403);
    if(target.role==='owner'&&(body.action==='remove'||body.role!=='owner')){
     const owners=(await c.query("SELECT user_id FROM organization_members WHERE organization_id=$1 AND role='owner'",[org])).rows;
     if(owners.length<=1)throw new TeamError('The last owner cannot be removed or demoted.',409);
    }
    if(body.action==='remove'||!['owner','admin'].includes(String(body.role))){
     const owned=await c.query(`SELECT 1 FROM channel_accounts a JOIN connectors co ON co.id=a.connector_id JOIN environments e ON e.id=co.environment_id JOIN projects p ON p.id=e.project_id WHERE a.owner_id=$1 AND p.organization_id=$2 AND co.status='active' LIMIT 1`,[target.user_id,org]);
     if(owned.rows.length)throw new TeamError('Transfer or disconnect active channels owned by this member first.',409);
    }
    if(body.action==='remove')await c.query('DELETE FROM organization_members WHERE id=$1 AND organization_id=$2',[body.id,org]);
    else{
     await c.query('UPDATE organization_members SET role=$3,updated_at=now() WHERE id=$1 AND organization_id=$2',[body.id,org,body.role]);
     await c.query('UPDATE profiles SET role=$3,updated_at=now() WHERE id=$1 AND organization_id=$2',[target.user_id,org,body.role]);
    }
    await c.query('UPDATE organization_invitations SET revoked_at=now() WHERE organization_id=$1 AND invited_by=$2 AND accepted_at IS NULL AND revoked_at IS NULL',[org,target.user_id]);
   }
   await this.audit(c,org,user,String(body.action),JSON.stringify({id:body.id,role:body.role}));return {success:true};
  });
 }
 async switchOrganization(user:string,org:unknown){
  if(typeof org!=='string'||!uuid.test(org))throw new TeamError('Select an organization.',400);
  return this.tx(async c=>{const membership=(await c.query('SELECT role FROM organization_members WHERE user_id=$1 AND organization_id=$2 FOR SHARE',[user,org])).rows[0];if(!membership)throw new TeamError('Organization access denied.',403);
   await c.query('UPDATE profiles SET organization_id=$2,role=$3,updated_at=now() WHERE id=$1',[user,org,membership.role]);await this.audit(c,org,user,'switch',org);return {success:true};});
 }
}
