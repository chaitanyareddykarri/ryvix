import { NextResponse } from 'next/server';
import { getDirectDbPool } from '@/utils/direct-db';
import { DeploymentEventError, deploymentWebhookBody, ingestGithubDeployment } from '../../../../../backend/src/services/deployment-ingestion';

export async function POST(request: Request) {
  try {
    const body = await deploymentWebhookBody(request);
    const result = await ingestGithubDeployment(body, request.headers, getDirectDbPool());
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof DeploymentEventError ? error.message : 'Deployment event persistence unavailable.' },
      { status: error instanceof DeploymentEventError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
