import { parseRobots, USER_AGENT } from './robots';

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export class FetchError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'FetchError';
  }
}

/**
 * Descargas educadas (ADR-0019): robots.txt, una petición cada `delayMs` por dominio,
 * tiempo límite, tamaño máximo, agente identificable y sin cookies.
 */
export class PoliteFetcher {
  private queues = new Map<string, Promise<void>>();
  private robots = new Map<string, Promise<(path: string) => boolean>>();

  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly delayMs = 3000,
  ) {}

  private async robotsFor(origin: string) {
    if (!this.robots.has(origin)) {
      this.robots.set(
        origin,
        this.rawText(`${origin}/robots.txt`, { timeoutMs: 8000, maxBytes: 512_000, accept: 'text/plain' })
          .then((r) => (r.status === 200 ? parseRobots(r.text) : () => true))
          .catch(() => () => true),
      );
    }
    return this.robots.get(origin)!;
  }

  async allowed(url: string): Promise<boolean> {
    const u = new URL(url);
    return (await this.robotsFor(u.origin))(u.pathname + u.search);
  }

  /** Espera su turno en la cola del dominio. */
  private async turn(host: string): Promise<void> {
    const prev = this.queues.get(host) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((r) => (release = r));
    this.queues.set(host, prev.then(() => next));
    await prev;
    setTimeout(release, this.delayMs);
  }

  private async rawText(
    url: string,
    opts: { timeoutMs: number; maxBytes: number; accept: string },
  ): Promise<{ status: number; text: string; contentType: string; finalUrl: string }> {
    const res = await this.fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: opts.accept },
      redirect: 'follow',
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
    const contentType = res.headers.get('content-type') ?? '';
    const reader = res.body?.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > opts.maxBytes) {
          await reader.cancel();
          throw new FetchError('La página supera el tamaño máximo');
        }
        chunks.push(value);
      }
    }
    return { status: res.status, text: Buffer.concat(chunks).toString('utf8'), contentType, finalUrl: res.url || url };
  }

  /** Descarga respetando robots.txt y el ritmo por dominio. */
  async get(
    url: string,
    opts: { timeoutMs?: number; maxBytes?: number; accept?: string; respectRobots?: boolean } = {},
  ) {
    if ((opts.respectRobots ?? true) && !(await this.allowed(url))) throw new FetchError('Bloqueado por robots.txt', 403);
    await this.turn(new URL(url).hostname);
    return this.rawText(url, {
      timeoutMs: opts.timeoutMs ?? 10_000,
      maxBytes: opts.maxBytes ?? 2_000_000,
      accept: opts.accept ?? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5',
    });
  }
}
