/** Legacy JSON experiments are never an authorized production data source. */
export function assertOfflineExperiment(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Offline AI experiment unavailable in production; use tenant-scoped reviewed services.');
  }
}
export function allowLegacyWeightFile(): boolean {
  return process.env.NODE_ENV !== 'production';
}
