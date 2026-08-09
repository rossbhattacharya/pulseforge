export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    retries?: number;
    baseMs?: number;
    shouldRetry?: (err: unknown) => boolean;
  } = {},
): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseMs = opts.baseMs ?? 800;
  const shouldRetry =
    opts.shouldRetry ??
    ((err: unknown) => {
      if (err && typeof err === "object" && "status" in err) {
        const status = Number((err as { status: number }).status);
        return status === 429 || status >= 500;
      }
      return true;
    });

  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (attempt === retries || !shouldRetry(err)) throw err;
      const delay = baseMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw last;
}

export class HttpError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body.slice(0, 280)}`);
    this.status = status;
    this.body = body;
  }
}
