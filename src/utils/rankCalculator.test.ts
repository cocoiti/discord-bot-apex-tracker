import { describe, it, expect } from "vitest";
import {
  getRankFromConfig,
  getNextTier,
  getDaysRemaining,
  calculateRankProgress,
  formatRankProgress,
} from "./rankCalculator.js";

describe("rankCalculator", () => {
  describe("getRankFromConfig", () => {
    it("should return rank info for valid rank name", () => {
      const rank = getRankFromConfig("Platinum II");
      expect(rank).toEqual({ name: "Platinum II", minRP: 10000 });
    });

    it("should return null for invalid rank name", () => {
      const rank = getRankFromConfig("Invalid Rank");
      expect(rank).toBeNull();
    });
  });

  describe("getNextTier", () => {
    it("should return Diamond for Platinum", () => {
      const nextTier = getNextTier("Platinum");
      expect(nextTier).toEqual({ tier: "Diamond", minRP: 12000 });
    });

    it("should return Master for Diamond", () => {
      const nextTier = getNextTier("Diamond");
      expect(nextTier).toEqual({ tier: "Master", minRP: 16000 });
    });

    it("should return Predator for Master", () => {
      const nextTier = getNextTier("Master");
      expect(nextTier).toEqual({ tier: "Predator", minRP: 99999 });
    });

    it("should return null for Predator (highest tier)", () => {
      const nextTier = getNextTier("Predator");
      expect(nextTier).toBeNull();
    });

    it("should return Bronze for Rookie", () => {
      const nextTier = getNextTier("Rookie");
      expect(nextTier).toEqual({ tier: "Bronze", minRP: 1000 });
    });
  });

  describe("getDaysRemaining", () => {
    it("should return positive number when split end date is in the future", () => {
      const days = getDaysRemaining();
      expect(days).toBeGreaterThanOrEqual(0);
    });

    it("should calculate correct days with injected date", () => {
      // season28 splitEndDate is "2026-03-25"
      const now = new Date(2026, 2, 16); // March 16, 2026
      const days = getDaysRemaining(now);
      expect(days).toBe(8); // 25-16=9, -1(早朝切り替え)=8
    });

    it("should return 0 on split end date", () => {
      const now = new Date(2026, 2, 25); // March 25, 2026 (end date)
      const days = getDaysRemaining(now);
      expect(days).toBe(0);
    });

    it("should return 0 when split end date has passed", () => {
      // 終了日を過ぎると次シーズンが選択されるため、season29_split1 (2026-05-06) の残日数になる
      const now = new Date(2026, 2, 26); // March 26, 2026
      const days = getDaysRemaining(now);
      expect(days).toBe(40); // 5/6 - 3/26 = 41, -1 = 40
    });
  });

  describe("calculateRankProgress", () => {
    it("should handle Rookie rank", () => {
      const progress = calculateRankProgress(500, "Rookie", 0);

      expect(progress.currentRankName).toBe("Rookie");
      expect(progress.currentTier).toBe("Rookie");
      expect(progress.nextTier).toEqual({ tier: "Bronze", minRP: 1000 });
      expect(progress.nextTierRPNeeded).toBe(500);
    });

    it("should calculate progress for Platinum II player", () => {
      const progress = calculateRankProgress(10862, "Platinum", 2);

      expect(progress.currentRP).toBe(10862);
      expect(progress.currentRankName).toBe("Platinum II");
      expect(progress.currentTier).toBe("Platinum");
      expect(progress.nextTier).toEqual({ tier: "Diamond", minRP: 12000 });
      expect(progress.nextTierRPNeeded).toBe(1138);
      expect(progress.nextNextTier).toEqual({ tier: "Master", minRP: 16000 });
      expect(progress.nextNextTierRPNeeded).toBe(5138);
    });

    it("should calculate progress for Gold IV player", () => {
      const progress = calculateRankProgress(5500, "Gold", 4);

      expect(progress.currentRankName).toBe("Gold IV");
      expect(progress.currentTier).toBe("Gold");
      expect(progress.nextTier).toEqual({ tier: "Platinum", minRP: 8250 });
      expect(progress.nextTierRPNeeded).toBe(2750);
    });

    it("should handle Master rank", () => {
      const progress = calculateRankProgress(18000, "Master", 0);

      expect(progress.currentRankName).toBe("Master");
      expect(progress.currentTier).toBe("Master");
      expect(progress.nextTier).toEqual({ tier: "Predator", minRP: 99999 });
    });

    it("should handle Diamond III player", () => {
      const progress = calculateRankProgress(13500, "Diamond", 3);

      expect(progress.currentRankName).toBe("Diamond III");
      expect(progress.currentTier).toBe("Diamond");
      expect(progress.nextTier).toEqual({ tier: "Master", minRP: 16000 });
      expect(progress.nextTierRPNeeded).toBe(2500);
    });
  });

  describe("formatRankProgress", () => {
    it("should format progress correctly with tier names", () => {
      const progress = calculateRankProgress(10862, "Platinum", 2);
      const formatted = formatRankProgress("TestPlayer", progress);

      expect(formatted).toContain("TestPlayer");
      expect(formatted).toContain("10862");
      expect(formatted).toContain("Platinum II");
      expect(formatted).toContain("Diamond");
      expect(formatted).toContain("12000 RP");
      expect(formatted).toContain("1138");
    });

    it("should show message for highest rank", () => {
      const progress = calculateRankProgress(100000, "Predator", 0);
      const formatted = formatRankProgress("TopPlayer", progress);

      expect(formatted).toContain("最高ランクに到達しています");
    });
  });
});
