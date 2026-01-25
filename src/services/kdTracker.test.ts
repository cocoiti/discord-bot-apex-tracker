import { describe, it, expect, beforeEach } from "vitest";
import {
  startSession,
  getSession,
  endSession,
  hasActiveSession,
  formatSessionResult,
  SessionResult,
} from "./kdTracker.js";

describe("kdTracker", () => {
  beforeEach(() => {
    // End any existing sessions to start fresh
    if (hasActiveSession("TestPlayer", "PC")) {
      endSession("TestPlayer", "PC", 0, 0);
    }
  });

  describe("startSession", () => {
    it("should start a new session", () => {
      startSession("TestPlayer", "PC", 100, 10000);

      expect(hasActiveSession("TestPlayer", "PC")).toBe(true);
      const session = getSession("TestPlayer", "PC");
      expect(session).not.toBeNull();
      expect(session?.playerName).toBe("TestPlayer");
      expect(session?.platform).toBe("PC");
      expect(session?.startKills).toBe(100);
      expect(session?.startRP).toBe(10000);
    });

    it("should be case-insensitive for player name", () => {
      startSession("TestPlayer", "PC", 100, 10000);

      expect(hasActiveSession("testplayer", "PC")).toBe(true);
      expect(hasActiveSession("TESTPLAYER", "PC")).toBe(true);
    });
  });

  describe("endSession", () => {
    it("should end session and calculate kills and RP", () => {
      startSession("TestPlayer", "PC", 100, 10000);

      const result = endSession("TestPlayer", "PC", 125, 10150);

      expect(result).not.toBeNull();
      expect(result?.kills).toBe(25);
      expect(result?.startRP).toBe(10000);
      expect(result?.endRP).toBe(10150);
      expect(result?.rpChange).toBe(150);
      expect(hasActiveSession("TestPlayer", "PC")).toBe(false);
    });

    it("should return null if no session exists", () => {
      const result = endSession("NonExistent", "PC", 100, 10000);

      expect(result).toBeNull();
    });

    it("should handle negative RP change", () => {
      startSession("TestPlayer", "PC", 100, 10000);

      const result = endSession("TestPlayer", "PC", 105, 9850);

      expect(result?.rpChange).toBe(-150);
    });
  });

  describe("formatSessionResult", () => {
    it("should format session result correctly with positive RP", () => {
      const result: SessionResult = {
        playerName: "TestPlayer",
        startTime: new Date("2024-01-01T14:30:00"),
        endTime: new Date("2024-01-01T16:00:00"),
        kills: 25,
        startRP: 10000,
        endRP: 10150,
        rpChange: 150,
      };

      const formatted = formatSessionResult(result);

      expect(formatted).toContain("**TestPlayer** のセッション結果");
      expect(formatted).toContain("セッションキル: **25**");
      expect(formatted).toContain("RP: 10000 → 10150 (**+150**)");
    });

    it("should format session result correctly with negative RP", () => {
      const result: SessionResult = {
        playerName: "TestPlayer",
        startTime: new Date("2024-01-01T14:30:00"),
        endTime: new Date("2024-01-01T16:00:00"),
        kills: 5,
        startRP: 10000,
        endRP: 9850,
        rpChange: -150,
      };

      const formatted = formatSessionResult(result);

      expect(formatted).toContain("RP: 10000 → 9850 (**-150**)");
    });
  });
});
