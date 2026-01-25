import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  rateLimitedFetch,
  resetRateLimiter,
  RateLimitError,
} from "./apiRateLimiter.js";

describe("apiRateLimiter", () => {
  beforeEach(() => {
    resetRateLimiter();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常なレスポンスを返す", async () => {
    const mockResponse = new Response(JSON.stringify({ data: "test" }), {
      status: 200,
    });
    vi.spyOn(global, "fetch").mockResolvedValue(mockResponse);

    const response = await rateLimitedFetch("https://example.com/api");

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith("https://example.com/api", undefined);
  });

  it("429エラー時にRateLimitErrorをスローする", async () => {
    const mockResponse = new Response("Too Many Requests", { status: 429 });
    vi.spyOn(global, "fetch").mockResolvedValue(mockResponse);

    await expect(
      rateLimitedFetch("https://example.com/api")
    ).rejects.toThrow(RateLimitError);
  });

  it("RateLimitErrorが正しいメッセージを持つ", () => {
    const error = new RateLimitError();
    expect(error.message).toBe(
      "APIのレート制限に達しました。しばらく待ってから再度お試しください。"
    );
    expect(error.name).toBe("RateLimitError");
  });

  it("複数のリクエストが順番に処理される", async () => {
    const callTimes: number[] = [];
    vi.spyOn(global, "fetch").mockImplementation(async () => {
      callTimes.push(Date.now());
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const startTime = Date.now();
    const [res1, res2, res3] = await Promise.all([
      rateLimitedFetch("https://example.com/1"),
      rateLimitedFetch("https://example.com/2"),
      rateLimitedFetch("https://example.com/3"),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(200);

    // 3つのリクエストが順番に処理されたことを確認
    expect(callTimes.length).toBe(3);

    // 2番目以降のリクエストは少なくとも400ms以上後に発行される（500ms間隔 - マージン）
    if (callTimes.length >= 2) {
      expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(400);
    }
    if (callTimes.length >= 3) {
      expect(callTimes[2] - callTimes[1]).toBeGreaterThanOrEqual(400);
    }
  });

  it("fetchエラーがそのまま伝播する", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

    await expect(
      rateLimitedFetch("https://example.com/api")
    ).rejects.toThrow("Network error");
  });

  it("オプションがfetchに渡される", async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
    });
    vi.spyOn(global, "fetch").mockResolvedValue(mockResponse);

    const options: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };

    await rateLimitedFetch("https://example.com/api", options);

    expect(fetch).toHaveBeenCalledWith("https://example.com/api", options);
  });
});
