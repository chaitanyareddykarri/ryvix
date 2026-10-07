import { createHash, randomBytes } from 'node:crypto';
import type { Pool } from 'pg';

export class SettingsError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export class SettingsStore {
  constructor(private readonly pool: Pool) {}
  async mutate(organizationId: string, userId: string, body: Record<string, unknown>) {
    const action = body.action;
    if (action !== 'update_org' && action !== 'generate_key' && action !== 'revoke_key') throw new SettingsError('Unknown action.',400);
    if(action==='revoke_key'&&(typeof body.keyId!=='string'||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.keyId)))throw new SettingsError('Valid key required.',400);
    const name = action === 'update_org' ? body.orgName : (body.keyName ?? 'Platform API Key');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) throw new SettingsError('Provide a name of 1–120 characters.',400);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL lock_timeout='5s'");
      const member = await client.query(`SELECT role FROM organization_members
        WHERE organization_id=$1 AND user_id=$2 FOR UPDATE`,[organizationId,userId]);
      if (!['owner','admin'].includes(member.rows[0]?.role)) throw new SettingsError('Forbidden.',403);
      let response: Record<string, unknown>;
      if(action==='revoke_key'){
        const revoked=await client.query('UPDATE api_keys SET revoked_at=now() WHERE id=$1 AND organization_id=$2 AND revoked_at IS NULL RETURNING id',[body.keyId,organizationId]);
        if(!revoked.rows.length)throw new SettingsError('Key not found or already revoked.',404);
        response={success:true,revokedKeyId:body.keyId};
      } else if (action === 'update_org') {
        await client.query('UPDATE organizations SET name=$1,updated_at=now() WHERE id=$2',[name.trim(),organizationId]);
        response = {success:true,message:'Organization updated successfully'};
      } else {
        const rawKey = `ryvix_live_${randomBytes(24).toString('hex')}`;
        const inserted = await client.query(`INSERT INTO api_keys(id,organization_id,name,key_prefix,hashed_secret,scopes,expires_at)
          VALUES(gen_random_uuid(),$1,$2,$3,$4,ARRAY['read'],now()+interval '1 year')
          RETURNING id,name,key_prefix,created_at,expires_at`,[organizationId,name.trim(),rawKey.slice(0,16),createHash('sha256').update(rawKey).digest('hex')]);
        response = {success:true,rawKey,key:inserted.rows[0]};
      }
      await client.query(`INSERT INTO organization_audit_events(organization_id,actor_id,action_name,parameters_hash)
        VALUES($1,$2,$3,$4)`,[organizationId,userId,`settings.${action}`,createHash('sha256').update(JSON.stringify(action==='revoke_key'?{keyId:body.keyId}:{name:name.trim()})).digest('hex')]);
      await client.query('COMMIT');
      return response;
    } catch(error) { await client.query('ROLLBACK').catch(()=>{}); throw error; }
    finally { client.release(); }
  }
}
