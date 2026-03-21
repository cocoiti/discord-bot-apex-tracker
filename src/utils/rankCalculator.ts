import seasonConfig from "../../config/season.json" with { type: "json" };

export interface RankInfo {
  name: string;
  minRP: number;
}

export interface TierInfo {
  tier: string;
  minRP: number;
}

export interface RankProgress {
  currentRP: number;
  currentRankName: string;
  currentTier: string;
  nextTier: TierInfo | null;
  nextNextTier: TierInfo | null;
  daysRemaining: number;
  splitEndDate: string;
  nextTierRPNeeded: number | null;
  nextTierDailyRP: number | null;
  nextNextTierRPNeeded: number | null;
  nextNextTierDailyRP: number | null;
  seasonName: string;
}

const TIERS = ["Rookie", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Predator"];

function getActiveSeason(now?: Date) {
  const today = now ?? new Date();
  today.setHours(0, 0, 0, 0);

  const seasons = Object.values(seasonConfig.seasons);

  // splitEndDate が今日以降で最も近いシーズンを選択
  const upcoming = seasons
    .map((s) => {
      const [y, m, d] = s.splitEndDate.split("-").map(Number);
      return { season: s, endDate: new Date(y, m - 1, d) };
    })
    .filter(({ endDate }) => endDate >= today)
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());

  if (upcoming.length > 0) {
    return upcoming[0].season;
  }

  // 全シーズンが過去の場合、最も新しいものを返す
  const all = seasons
    .map((s) => {
      const [y, m, d] = s.splitEndDate.split("-").map(Number);
      return { season: s, endDate: new Date(y, m - 1, d) };
    })
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());

  return all[0].season;
}

function formatRankName(rankName: string, rankDiv: number): string {
  if (rankName === "Rookie" || rankName === "Master" || rankName === "Predator") {
    return rankName;
  }
  const divMap: { [key: number]: string } = { 1: "I", 2: "II", 3: "III", 4: "IV" };
  return `${rankName} ${divMap[rankDiv] || rankDiv}`;
}

function getTierFromRankName(rankName: string): string {
  for (const tier of TIERS) {
    if (rankName.startsWith(tier)) {
      return tier;
    }
  }
  return rankName;
}

export function getRankFromConfig(rankName: string): RankInfo | null {
  const season = getActiveSeason();
  const rank = season.ranks.find((r) => r.name === rankName);
  return rank || null;
}

export function getNextTier(currentTier: string): TierInfo | null {
  const season = getActiveSeason();
  const ranks = season.ranks;
  const currentTierIndex = TIERS.indexOf(currentTier);

  if (currentTierIndex === -1 || currentTierIndex >= TIERS.length - 1) {
    return null;
  }

  const nextTierName = TIERS[currentTierIndex + 1];

  // Find the first rank of the next tier (e.g., "Diamond IV" or "Master")
  const nextTierRank = ranks.find((r) => {
    if (nextTierName === "Master" || nextTierName === "Predator") {
      return r.name === nextTierName;
    }
    return r.name === `${nextTierName} IV`;
  });

  if (!nextTierRank) {
    return null;
  }

  return {
    tier: nextTierName,
    minRP: nextTierRank.minRP,
  };
}

export function getDaysRemaining(now?: Date): number {
  const season = getActiveSeason();
  // Date-only文字列（"YYYY-MM-DD"）はUTCとして解釈されるため、
  // 手動でパースしてローカル日付として扱う
  const [year, month, day] = season.splitEndDate.split("-").map(Number);
  const endDate = new Date(year, month - 1, day);
  const today = now ? new Date(now.getTime()) : new Date();
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function calculateRankProgress(
  currentRP: number,
  apiRankName: string,
  apiRankDiv: number
): RankProgress {
  const season = getActiveSeason();
  const currentRankName = formatRankName(apiRankName, apiRankDiv);
  const currentTier = getTierFromRankName(currentRankName);
  const nextTier = getNextTier(currentTier);
  const nextNextTier = nextTier ? getNextTier(nextTier.tier) : null;
  const daysRemaining = getDaysRemaining();

  let nextTierRPNeeded: number | null = null;
  let nextTierDailyRP: number | null = null;
  let nextNextTierRPNeeded: number | null = null;
  let nextNextTierDailyRP: number | null = null;

  if (nextTier) {
    nextTierRPNeeded = nextTier.minRP - currentRP;
    nextTierDailyRP =
      daysRemaining > 0 ? Math.ceil(nextTierRPNeeded / daysRemaining) : null;
  }

  if (nextNextTier) {
    nextNextTierRPNeeded = nextNextTier.minRP - currentRP;
    nextNextTierDailyRP =
      daysRemaining > 0 ? Math.ceil(nextNextTierRPNeeded / daysRemaining) : null;
  }

  return {
    currentRP,
    currentRankName,
    currentTier,
    nextTier,
    nextNextTier,
    daysRemaining,
    splitEndDate: season.splitEndDate,
    nextTierRPNeeded,
    nextTierDailyRP,
    nextNextTierRPNeeded,
    nextNextTierDailyRP,
    seasonName: season.name,
  };
}

export function formatRankProgress(
  playerName: string,
  progress: RankProgress
): string {
  const lines: string[] = [];
  lines.push(`**${playerName}** のランク情報`);
  lines.push(`シーズン: ${progress.seasonName}`);
  lines.push(`現在のRP: **${progress.currentRP}** (${progress.currentRankName})`);
  const [y, m, d] = progress.splitEndDate.split("-").map(Number);
  lines.push(`スプリット終了: **${y}/${m}/${d} 早朝** (残り **${progress.daysRemaining}日**)`);
  lines.push("");

  if (progress.nextTier) {
    lines.push(
      `▶ 次のランク: **${progress.nextTier.tier}** (${progress.nextTier.minRP} RP)`
    );
    lines.push(`  必要RP: ${progress.nextTierRPNeeded}`);
    if (progress.nextTierDailyRP !== null) {
      lines.push(`  1日あたり: **${progress.nextTierDailyRP} RP**`);
    }
  } else {
    lines.push("▶ 最高ランクに到達しています");
  }

  if (progress.nextNextTier) {
    lines.push("");
    lines.push(
      `▶▶ その次のランク: **${progress.nextNextTier.tier}** (${progress.nextNextTier.minRP} RP)`
    );
    lines.push(`  必要RP: ${progress.nextNextTierRPNeeded}`);
    if (progress.nextNextTierDailyRP !== null) {
      lines.push(`  1日あたり: **${progress.nextNextTierDailyRP} RP**`);
    }
  }

  return lines.join("\n");
}
