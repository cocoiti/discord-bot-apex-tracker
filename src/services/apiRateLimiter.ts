// レート制限付きfetch
// Apex Legends Status API: 2リクエスト/秒（安全マージンとして500ms間隔）

const MIN_INTERVAL_MS = 500;
let lastRequestTime = 0;
let pendingQueue: Array<{
  resolve: (value: Response) => void;
  reject: (reason: unknown) => void;
  url: string;
  options?: RequestInit;
}> = [];
let isProcessing = false;

export class RateLimitError extends Error {
  constructor() {
    super("APIのレート制限に達しました。しばらく待ってから再度お試しください。");
    this.name = "RateLimitError";
  }
}

async function processQueue(): Promise<void> {
  if (isProcessing || pendingQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (pendingQueue.length > 0) {
    const request = pendingQueue.shift();
    if (!request) continue;

    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    const waitTime = Math.max(0, MIN_INTERVAL_MS - timeSinceLastRequest);

    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    try {
      lastRequestTime = Date.now();
      const response = await fetch(request.url, request.options);

      if (response.status === 429) {
        request.reject(new RateLimitError());
      } else {
        request.resolve(response);
      }
    } catch (error) {
      request.reject(error);
    }
  }

  isProcessing = false;
}

export function rateLimitedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  return new Promise((resolve, reject) => {
    pendingQueue.push({ resolve, reject, url, options });
    processQueue();
  });
}

// テスト用: キューと状態をリセット
export function resetRateLimiter(): void {
  pendingQueue = [];
  lastRequestTime = 0;
  isProcessing = false;
}
