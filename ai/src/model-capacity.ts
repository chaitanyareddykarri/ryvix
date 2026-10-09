export class ModelQuotaError extends Error {
  constructor(readonly retryAt:number){super('No AI provider is available: configured providers are rate limited; retry after the recorded cooldown.');this.name='ModelQuotaError';}
}
