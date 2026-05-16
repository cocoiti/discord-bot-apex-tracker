import { describe, it, expect } from "vitest";
import seasonConfig from "../../config/season.json" with { type: "json" };
import {
  getRankFromConfig,
  getNextTier,
  getDaysRemaining,
  calculateRankProgress,
  formatRankProgress,
} from "./rankCalculator.js";

// テスト用にconfigから実際の値を取得するヘルパー
function getActiveSeasonForTest() {
  const now = new Date();
  const seasons = Object.values(seasonConfig.seasons);
  const upcoming = seasons
    .map((s) => {
      const [y, m, d] = s.splitEndDate.split("-").map(Number);
      return { season: s, endDateTime: new Date(y, m - 1, d, 3, 0, 0) };
    })
    .filter(({ endDateTime }) => endDateTime > now)
    .sort((a, b) => a.endDateTime.getTime() - b.endDateTime.getTime());

  if (upcoming.length > 0) return upcoming[0].season;

  const all = seasons
    .map((s) => {
      const [y, m, d] = s.splitEndDate.split("-").map(Number);
      return { season: s, endDate: new Date(y, m - 1, d) };
    })
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
  return all[0].season;
}

const activeSeason = getActiveSeasonForTest();

function findRank(name: string) {
  return activeSeason.ranks.find((r) => r.name === name)!;
}

function findTierMinRP(tier: string) {
  if (tier === "Master" || tier === "Predator") {
    return activeSeason.ranks.find((r) => r.name === tier)!.minRP;
  }
  return activeSeason.ranks.find((r) => r.name === `${tier} IV`)!.minRP;
}

describe("rankCalculator", () => {
  describe("getRankFromConfig", () => {
    it("should return rank info for valid rank name", () => {
      const rank = getRankFromConfig("Platinum II");
      const expected = findRank("Platinum II");
      expect(rank).toEqual({ name: "Platinum II", minRP: expected.minRP });
    });

    it("should return null for invalid rank name", () => {
      const rank = getRankFromConfig("Invalid Rank");
      expect(rank).toBeNull();
    });
  });

  describe("getNextTier", () => {
    it("should return Diamond for Platinum", () => {
      const nextTier = getNextTier("Platinum");
      expect(nextTier).toEqual({ tier: "Diamond", minRP: findTierMinRP("Diamond") });
    });

    it("should return Master for Diamond", () => {
      const nextTier = getNextTier("Diamond");
      expect(nextTier).toEqual({ tier: "Master", minRP: findTierMinRP("Master") });
    });

    it("should return Predator for Master", () => {
      const nextTier = getNextTier("Master");
      expect(nextTier).toEqual({ tier: "Predator", minRP: findTierMinRP("Predator") });
    });

    it("should return null for Predator (highest tier)", () => {
      const nextTier = getNextTier("Predator");
      expect(nextTier).toBeNull();
    });

    it("should return Bronze for Rookie", () => {
      const nextTier = getNextTier("Rookie");
      expect(nextTier).toEqual({ tier: "Bronze", minRP: findTierMinRP("Bronze") });
    });
  });

  describe("getDaysRemaining", () => {
    it("should return positive number when split end date is in the future", () => {
      const days = getDaysRemaining();
      expect(days).toBeGreaterThanOrEqual(0);
    });

    it("should calculate correct days with injected date", () => {
      const now = new Date(2026, 2, 16); // March 16, 2026
      const days = getDaysRemaining(now);
      expect(days).toBe(8); // season28_split1 ends 2026-03-25, 25-16=9, -1(早朝切り替え)=8
    });

    it("should return 0 on split end date", () => {
      const now = new Date(2026, 2, 25); // March 25, 2026 (end date)
      const days = getDaysRemaining(now);
      expect(days).toBe(0);
    });

    it("should return 0 when split end date has passed", () => {
      // 終了日を過ぎると次シーズンが選択されるため、season28_split2 (2026-05-06) の残日数になる
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
      expect(progress.nextTier).toEqual({ tier: "Bronze", minRP: findTierMinRP("Bronze") });
      expect(progress.nextTierRPNeeded).toBe(findTierMinRP("Bronze") - 500);
    });

    it("should calculate progress for Platinum II player", () => {
      const platIIMinRP = findRank("Platinum II").minRP;
      const testRP = platIIMinRP + 862;
      const progress = calculateRankProgress(testRP, "Platinum", 2);

      expect(progress.currentRP).toBe(testRP);
      expect(progress.currentRankName).toBe("Platinum II");
      expect(progress.currentTier).toBe("Platinum");
      expect(progress.nextTier).toEqual({ tier: "Diamond", minRP: findTierMinRP("Diamond") });
      expect(progress.nextTierRPNeeded).toBe(findTierMinRP("Diamond") - testRP);
      expect(progress.nextNextTier).toEqual({ tier: "Master", minRP: findTierMinRP("Master") });
      expect(progress.nextNextTierRPNeeded).toBe(findTierMinRP("Master") - testRP);
    });

    it("should calculate progress for Gold IV player", () => {
      const goldIVMinRP = findRank("Gold IV").minRP;
      const testRP = goldIVMinRP + 250;
      const progress = calculateRankProgress(testRP, "Gold", 4);

      expect(progress.currentRankName).toBe("Gold IV");
      expect(progress.currentTier).toBe("Gold");
      expect(progress.nextTier).toEqual({ tier: "Platinum", minRP: findTierMinRP("Platinum") });
      expect(progress.nextTierRPNeeded).toBe(findTierMinRP("Platinum") - testRP);
    });

    it("should handle Master rank", () => {
      const progress = calculateRankProgress(18000, "Master", 0);

      expect(progress.currentRankName).toBe("Master");
      expect(progress.currentTier).toBe("Master");
      expect(progress.nextTier).toEqual({ tier: "Predator", minRP: findTierMinRP("Predator") });
    });

    it("should handle Diamond III player", () => {
      const diamondIIIMinRP = findRank("Diamond III").minRP;
      const testRP = diamondIIIMinRP + 500;
      const progress = calculateRankProgress(testRP, "Diamond", 3);

      expect(progress.currentRankName).toBe("Diamond III");
      expect(progress.currentTier).toBe("Diamond");
      expect(progress.nextTier).toEqual({ tier: "Master", minRP: findTierMinRP("Master") });
      expect(progress.nextTierRPNeeded).toBe(findTierMinRP("Master") - testRP);
    });
  });

  describe("formatRankProgress", () => {
    it("should format progress correctly with tier names", () => {
      const platIIMinRP = findRank("Platinum II").minRP;
      const testRP = platIIMinRP + 862;
      const progress = calculateRankProgress(testRP, "Platinum", 2);
      const formatted = formatRankProgress("TestPlayer", progress);

      expect(formatted).toContain("TestPlayer");
      expect(formatted).toContain(String(testRP));
      expect(formatted).toContain("Platinum II");
      expect(formatted).toContain("Diamond");
      expect(formatted).toContain(`${findTierMinRP("Diamond")} RP`);
      expect(formatted).toContain(String(findTierMinRP("Diamond") - testRP));
    });

    it("should show message for highest rank", () => {
      const progress = calculateRankProgress(100000, "Predator", 0);
      const formatted = formatRankProgress("TopPlayer", progress);

      expect(formatted).toContain("最高ランクに到達しています");
    });
  });
});
