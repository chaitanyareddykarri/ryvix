import { NextResponse } from 'next/server';
import { boundedDeviceBody, ingestDevice } from '@/utils/device-ingestion';
import { DeviceError } from '../../../../../backend/src/services/device-protocol';

export async function POST(request: Request) {
  try {
    const result = await ingestDevice(await boundedDeviceBody(request), request.headers);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof DeviceError ? error.message : 'Telemetry persistence unavailable.' },
      { status: error instanceof DeviceError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
