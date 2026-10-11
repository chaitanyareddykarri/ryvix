import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localWorkspaceConfiguration} from '../scripts/local-workspace-config.mjs';
const env={DATABASE_URL:'postgresql://localhost:5432/fixture',RYVIX_MODEL_PROVIDER:'gemini',GEMINI_MODEL:'fixture',GEMINI_API_KEY:'fixture',PREVIEW_SIGNING_SECRET:'a'.repeat(64),RYVIX_WORKER_HOST_ID:'local-1',PREVIEW_BASE_DOMAIN:'preview.example.test',RYVIX_WORKER_PREVIEW_DOMAINS:'{"local-1":"preview.example.test"}',RYVIX_PUBLIC_URL:'https://example.test',RYVIX_WORKSPACE_MODE:'static',RYVIX_WORKSPACE_IMAGES:'static',RYVIX_WORKSPACE_STATIC_IMAGE:'static',RYVIX_PREVIEW_RELAY_IMAGE:'static'};
test('preflight rejects incomplete models, host mapping, images and transaction pooling',()=>{
 assert.deepEqual(localWorkspaceConfiguration(env).images,['static']);
 for(const changed of [{GEMINI_API_KEY:''},{GEMINI_MODEL:''},{PREVIEW_SIGNING_SECRET:''},{PREVIEW_BASE_DOMAIN:'wrong.example.test'},{RYVIX_WORKSPACE_IMAGES:''},{DATABASE_URL:env.DATABASE_URL.replace('5432','6543')}])assert.throws(()=>localWorkspaceConfiguration({...env,...changed}));
});
