import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchMapRotation, formatMapStatus } from "./mapRotation.js";

describe("mapRotation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, APEX_API_KEY: "test-api-key" };
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  describe("fetchMapRotation", () => {
    it("should fetch map rotation successfully", async () => {
      const mockResponse = {
        battle_royale: {
          current: {
            map: "World's Edge",
            remainingTimer: "01:23:45",
            remainingMins: 83,
          },
          next: {
            map: "Storm Point",
          },
        },
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await fetchMapRotation();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api.mozambiquehe.re/maprotation")
      );
      expect(result).toEqual({
        current: {
          name: "World's Edge",
          remainingTime: "01:23:45",
          remainingMins: 83,
        },
        next: {
          name: "Storm Point",
          remainingTime: "",
          remainingMins: 0,
        },
      });
    });

    it("should throw error when API key is not set", async () => {
      delete process.env.APEX_API_KEY;

      await expect(fetchMapRotation()).rejects.toThrow(
        "APEX_API_KEY is not set"
      );
    });

    it("should throw error when API returns error status", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ Error: "Server Error" }),
      } as Response);

      await expect(fetchMapRotation()).rejects.toThrow(
        "API request failed: 500"
      );
    });
  });

  describe("formatMapStatus", () => {
    it("should format map status correctly", () => {
      const rotation = {
        current: {
          name: "World's Edge",
          remainingTime: "01:23:45",
          remainingMins: 83,
        },
        next: {
          name: "Storm Point",
          remainingTime: "",
          remainingMins: 0,
        },
      };

      const result = formatMapStatus(rotation);

      expect(result).toBe("World's Edge (残り01:23:45)");
    });
  });
});
