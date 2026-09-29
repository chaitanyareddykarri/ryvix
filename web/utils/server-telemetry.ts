/** Legacy rollups have no uptime or network sample provenance; do not expose defaults as measurements. */
export function serverTelemetry(row: Record<string, unknown>, now = Date.now()) {
  const value = row.bucket_timestamp;
  const timestamp = value instanceof Date ? value.getTime() : typeof value === 'string' ? Date.parse(value) : NaN;
  const age = now - timestamp;
  const telemetryStatus = !Number.isFinite(timestamp) ? 'missing'
    : age < 0 ? 'invalid' : age > 120_000 ? 'stale' : 'fresh';
  function percent(value: unknown): number | null {
    if (telemetryStatus !== 'fresh' || (typeof value !== 'number' && typeof value !== 'string')
      || (typeof value === 'string' && !value.trim())) return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
  }
  return {
    cpuPercent: percent(row.cpu_avg), memoryPercent: percent(row.ram_percent),
    diskPercent: percent(row.disk_used_percent), telemetryStatus,
    latestSampleAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
    uptimeSeconds: null, networkRxKb: null, networkTxKb: null,
  };
}
