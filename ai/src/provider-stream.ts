import type { LLMMessage, ProviderDefinition } from './model-gateway';
import {streamUsage,type TokenUsage} from './token-usage';

/** Incremental SSE decoder shared by compatible and Anthropic providers. */
export async function* streamProvider(provider: ProviderDefinition, messages: LLMMessage[],
  options: { maxTokens?: number; temperature?: number; signal?: AbortSignal;onUsage?:(usage:TokenUsage)=>void;onObservedUsage?:(usage:TokenUsage)=>void }) {
  const claude = provider.id === 'claude', hf = provider.id === 'huggingface';
  const url = claude ? 'https://api.anthropic.com/v1/messages' : hf
    ? `${provider.baseUrl}/${provider.model}` : `${provider.baseUrl}/chat/completions`;
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (claude) { headers['x-api-key'] = provider.apiKey || ''; headers['anthropic-version'] = '2023-06-01'; }
  else if (provider.apiKey) headers.Authorization = `Bearer ${provider.apiKey}`;
  const payload = hf ? { stream: true, inputs: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
    parameters: { max_new_tokens: options.maxTokens ?? 4096, return_full_text: false } }
    : { stream: true, model: provider.model, max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.2,
      messages: claude ? messages.filter(m => m.role !== 'system') : messages,
      ...(claude ? { system: messages.filter(m => m.role === 'system').map(m => m.content).join('\n') }
        : ['openai','groq','gemini'].includes(provider.id)?{stream_options:{include_usage:true}}:{}) };
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: options.signal });
  if (!response.ok || !response.body) {
    const retry = response.headers.get('retry-after');
    const seconds = retry === null ? NaN : Number(retry);
    const retryAt = Number.isFinite(seconds) ? Date.now()+Math.max(0,seconds)*1000 : Date.parse(retry || '');
    await response.body?.cancel();
    throw Object.assign(new Error(`Provider stream unavailable (HTTP ${response.status})`),{retryAt});
  }
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    await response.body.cancel(); throw new Error('Provider did not return an event stream');
  }
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', total = 0, ended = false;
  let usage:TokenUsage|undefined;
  try {
    while (!ended) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 2 * 1024 * 1024) throw new Error('Provider stream exceeded limit');
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, '\n');
      let separator: number;
      while ((separator = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0,separator); buffer = buffer.slice(separator+2);
        const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
        if (!data) continue;
        if (data === '[DONE]') { ended = true; break; }
        const event = JSON.parse(data);
        usage=streamUsage(event,claude,usage);
        if(usage)options.onObservedUsage?.(usage);
        if (event.error || event.type === 'error') throw new Error('Provider stream failed');
        if (event.choices?.[0]?.finish_reason === 'length' || event.delta?.stop_reason === 'max_tokens')
          throw new Error('Provider answer reached its output limit');
        if (event.type === 'message_stop') { ended = true; break; }
        const text = claude ? (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' ? event.delta.text : '')
          : hf ? (event.token?.special ? '' : event.token?.text) : event.choices?.[0]?.delta?.content;
        if (typeof text === 'string' && text) yield text;
        if (hf && typeof event.generated_text === 'string') { ended = true; break; }
      }
      if (buffer.length > 262144) throw new Error('Provider event exceeded limit');
    }
    if (!ended) throw new Error('Provider stream ended before completion');
    if(usage)options.onUsage?.(usage);
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
