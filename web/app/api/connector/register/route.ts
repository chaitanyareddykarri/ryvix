import { NextResponse } from 'next/server';
import { boundedDeviceBody, registerDevice } from '@/utils/device-ingestion';
import { DeviceError } from '../../../../../backend/src/services/device-protocol';

export async function POST(request: Request) {
  try {
    let body;
    try { body = JSON.parse((await boundedDeviceBody(request, 8192)).toString('utf8')); }
    catch (error) { if (error instanceof DeviceError) throw error; throw new DeviceError('Invalid registration JSON.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new DeviceError('Registration object required.');
    const connector = await registerDevice(body);
    return NextResponse.json({ success: true, connector }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof DeviceError ? error.message : 'Device registration unavailable.' },
      { status: error instanceof DeviceError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
