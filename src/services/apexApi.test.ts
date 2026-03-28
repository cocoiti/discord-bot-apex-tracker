import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchPlayerStats, formatKills, ApiError } from "./apexApi.js";
import { resetRateLimiter } from "./apiRateLimiter.js";
import { ValidationError } from "../utils/validation.js";

describe("apexApi", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetRateLimiter();
    process.env = { ...originalEnv, APEX_API_KEY: "test-api-key" };
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  describe("fetchPlayerStats", () => {
    it("should fetch player stats successfully", async () => {
      const mockResponse = {
        global: {
          name: "TestPlayer",
          platform: "PC",
          level: 500,
          rank: {
            rankScore: 10862,
            rankName: "Platinum",
            rankDiv: 2,
          },
        },
        total: {
          kills: { value: 5000 },
          deaths: { value: 2500 },
        },
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await fetchPlayerStats("TestPlayer", "PC");

      expect(fetch).toHaveBeenCalled();
      const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(calledUrl).toContain("api.mozambiquehe.re/bridge");
      expect(calledUrl).toContain("player=TestPlayer");
      expect(calledUrl).toContain("platform=PC");
      expect(result).toEqual({
        name: "TestPlayer",
        platform: "PC",
        level: 500,
        currentRP: 10862,
        rankName: "Platinum",
        rankDiv: 2,
        kills: 5000,
      });
    });

    it("should use PC as default platform", async () => {
      const mockResponse = {
        global: {
          name: "TestPlayer",
          platform: "PC",
          level: 100,
          rank: {
            rankScore: 5000,
            rankName: "Gold",
            rankDiv: 4,
          },
        },
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await fetchPlayerStats("TestPlayer");

      expect(fetch).toHaveBeenCalled();
      const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(calledUrl).toContain("platform=PC");
    });

    it("should throw error when API key is not set", async () => {
      delete process.env.APEX_API_KEY;

      await expect(fetchPlayerStats("TestPlayer")).rejects.toThrow(
        "APEX_API_KEY is not set"
      );
    });

    it("should throw error when API returns error status", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ Error: "Bad Request" }),
      } as Response);

      await expect(fetchPlayerStats("TestPlayer")).rejects.toThrow(
        "API request failed: 400"
      );
    });

    it("should throw error when API returns error in response body", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Error: "Player not found" }),
      } as Response);

      await expect(fetchPlayerStats("InvalidPlayer")).rejects.toThrow(
        "Player not found"
      );
    });

    it("should handle different platforms", async () => {
      const mockResponse = {
        global: {
          name: "PSPlayer",
          platform: "PS4",
          level: 200,
          rank: {
            rankScore: 8000,
            rankName: "Platinum",
            rankDiv: 4,
          },
        },
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await fetchPlayerStats("PSPlayer", "PS4");

      expect(fetch).toHaveBeenCalled();
      const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(calledUrl).toContain("platform=PS4");
    });

    it("should handle missing kills data", async () => {
      const mockResponse = {
        global: {
          name: "TestPlayer",
          platform: "PC",
          level: 100,
          rank: {
            rankScore: 5000,
            rankName: "Gold",
            rankDiv: 4,
          },
        },
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await fetchPlayerStats("TestPlayer");

      expect(result.kills).toBe(0);
    });

    it("should throw ApiError when JSON parsing fails", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error("Invalid JSON")),
      } as Response);

      await expect(fetchPlayerStats("TestPlayer")).rejects.toThrow(ApiError);
      await expect(fetchPlayerStats("TestPlayer")).rejects.toThrow(
        "APIからの応答を解析できませんでした"
      );
    });

    it("should throw ValidationError for empty player name", async () => {
      await expect(fetchPlayerStats("")).rejects.toThrow(ValidationError);
      await expect(fetchPlayerStats("   ")).rejects.toThrow(ValidationError);
    });

    it("should accept Japanese player names", async () => {
      const mockResponse = {
        global: {
          name: "日本語プレイヤー",
          platform: "PC",
          level: 100,
          rank: {
            rankScore: 5000,
            rankName: "Gold",
            rankDiv: 4,
          },
        },
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await fetchPlayerStats("日本語プレイヤー");
      expect(result.name).toBe("日本語プレイヤー");

      // URLエンコードされていることを確認
      const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(calledUrl).toContain("player=");
      expect(calledUrl).not.toContain("日本語"); // エンコードされているはず
    });

    it("should throw ValidationError for invalid platform", async () => {
      await expect(fetchPlayerStats("TestPlayer", "PS5")).rejects.toThrow(
        ValidationError
      );
    });

    it("should throw ApiError when global data is missing", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await expect(fetchPlayerStats("TestPlayer")).rejects.toThrow(ApiError);
      await expect(fetchPlayerStats("TestPlayer")).rejects.toThrow(
        "プレイヤーデータを取得できませんでした"
      );
    });
  });

  describe("formatKills", () => {
    it("should format kills correctly", () => {
      const result = formatKills(5000);
      expect(result).toBe("累計キル: 5,000");
    });

    it("should handle zero kills with tracker warning", () => {
      const result = formatKills(0);
      expect(result).toBe("累計キル: 不明 (バナーにキルトラッカーを装備してください)");
    });
  });
});
