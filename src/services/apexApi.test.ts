import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchPlayerStats } from "./apexApi.js";

describe("apexApi", () => {
  const originalEnv = process.env;

  beforeEach(() => {
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
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await fetchPlayerStats("TestPlayer", "PC");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api.mozambiquehe.re/bridge")
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("player=TestPlayer")
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("platform=PC")
      );
      expect(result).toEqual({
        name: "TestPlayer",
        platform: "PC",
        level: 500,
        currentRP: 10862,
        rankName: "Platinum",
        rankDiv: 2,
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

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("platform=PC")
      );
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

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("platform=PS4")
      );
    });
  });
});
