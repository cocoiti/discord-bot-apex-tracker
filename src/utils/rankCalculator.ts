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

// Apexのシーズン/スプリット切り替えは 17:00 UTC（10:00 PT）に行われる。
// 本番はTZ未設定（UTC）で動作するため、終了日の 17:00 UTC を切り替え基準にする。
const SPLIT_RESET_UTC_HOUR = 17;

// 日本時間（JST）は UTC+9。表示・残日数はJST基準に揃える。
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 終了日(UTC "YYYY-MM-DD")の 17:00 UTC リセットを JST に変換した日時を返す。
// 実リセットは JST では翌日 02:00 になる（例: 2026-09-15 → JST 2026-09-16 02:00）。
// 戻り値は getUTC*() で JST の各要素が読める点に注意。
function getResetJst(splitEndDate: string): Date {
  const [y, m, d] = splitEndDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, SPLIT_RESET_UTC_HOUR, 0, 0) + JST_OFFSET_MS);
}

function getActiveSeason(now?: Date) {
  const currentTime = now ?? new Date();

  const seasons = Object.values(seasonConfig.seasons);

  // 終了日の 17:00 UTC（実リセット時刻）を基準に比較する
  const upcoming = seasons
    .map((s) => {
      const [y, m, d] = s.splitEndDate.split("-").map(Number);
      return { season: s, endDateTime: new Date(Date.UTC(y, m - 1, d, SPLIT_RESET_UTC_HOUR, 0, 0)) };
    })
    .filter(({ endDateTime }) => endDateTime > currentTime)
    .sort((a, b) => a.endDateTime.getTime() - b.endDateTime.getTime());

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

export function getDaysRemaining(now?: Date, splitEndDateOverride?: string): number {
  // APIが実終了日を返す場合はそれを優先し、無ければconfigの推定値を使う
  const splitEndDate = splitEndDateOverride ?? getActiveSeason(now).splitEndDate;
  // 実リセットは「終了日の 17:00 UTC」= JST 翌日 02:00（早朝）。
  // JST基準で「今日」と「最終プレイ日(=UTC終了日と同じ日付)」の差を残日数とする。
  // 例: 終了日 2026-09-15 なら JST 9/15 が最終日で、9/16 02:00 に切り替わる。
  const nowMs = now ? now.getTime() : Date.now();
  const nowJst = new Date(nowMs + JST_OFFSET_MS);
  const todayJst = Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate());
  const [year, month, day] = splitEndDate.split("-").map(Number);
  const lastPlayDayJst = Date.UTC(year, month - 1, day);
  const diffDays = Math.round((lastPlayDayJst - todayJst) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function calculateRankProgress(
  currentRP: number,
  apiRankName: string,
  apiRankDiv: number,
  splitEndDateOverride?: string
): RankProgress {
  const season = getActiveSeason();
  const currentRankName = formatRankName(apiRankName, apiRankDiv);
  const currentTier = getTierFromRankName(currentRankName);
  const nextTier = getNextTier(currentTier);
  const nextNextTier = nextTier ? getNextTier(nextTier.tier) : null;
  const daysRemaining = getDaysRemaining(undefined, splitEndDateOverride);

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
    splitEndDate: splitEndDateOverride ?? season.splitEndDate,
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
  // 実リセットは終了日 17:00 UTC = JST 翌日 02:00（早朝）。JST日付で表示する。
  const reset = getResetJst(progress.splitEndDate);
  const y = reset.getUTCFullYear();
  const m = reset.getUTCMonth() + 1;
  const d = reset.getUTCDate();
  const remaining = progress.daysRemaining === 0
    ? "**当日**"
    : `残り **${progress.daysRemaining}日**`;
  lines.push(`スプリット終了: **${y}/${m}/${d} 早朝** (${remaining})`);
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
