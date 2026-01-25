import { rateLimitedFetch } from "./apiRateLimiter.js";
import { validatePlayerName, validatePlatform } from "../utils/validation.js";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApexPlayerStats {
  name: string;
  platform: string;
  level: number;
  currentRP: number;
  rankName: string;
  rankDiv: number;
  kills: number;
}

export async function fetchPlayerStats(
  playerName: string,
  platform: string = "PC"
): Promise<ApexPlayerStats> {
  // 入力検証（トリム済みの名前を取得）
  const validPlayerName = validatePlayerName(playerName);
  const validPlatform = validatePlatform(platform);

  const apiKey = process.env.APEX_API_KEY;
  if (!apiKey) {
    throw new ApiError("APEX_API_KEY is not set");
  }

  // URLSearchParamsは自動的にURLエンコードを行う（日本語名も対応）
  const params = new URLSearchParams({
    auth: apiKey,
    player: validPlayerName,
    platform: validPlatform,
  });

  const response = await rateLimitedFetch(
    `https://api.mozambiquehe.re/bridge?${params.toString()}`
  );

  // JSONパースエラーハンドリング
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      "APIからの応答を解析できませんでした。しばらく待ってから再度お試しください。",
      response.status
    );
  }

  if (!response.ok) {
    // エラーメッセージからAPIキーを除外
    const errorData = data as Record<string, unknown>;
    const errorMessage = errorData?.Error || "Unknown error";
    throw new ApiError(`API request failed: ${response.status} - ${errorMessage}`, response.status);
  }

  const typedData = data as Record<string, unknown>;
  if (typedData.Error) {
    throw new ApiError(String(typedData.Error));
  }

  // 防御的なデータ抽出
  const global = typedData.global as Record<string, unknown> | undefined;
  if (!global) {
    throw new ApiError("プレイヤーデータを取得できませんでした。");
  }

  const rank = global.rank as Record<string, unknown> | undefined;
  if (!rank) {
    throw new ApiError("ランクデータを取得できませんでした。");
  }

  const total = typedData.total as Record<string, Record<string, unknown>> | undefined;
  const kills = (total?.kills?.value as number) ?? 0;

  return {
    name: String(global.name ?? playerName),
    platform: String(global.platform ?? validPlatform),
    level: Number(global.level ?? 0),
    currentRP: Number(rank.rankScore ?? 0),
    rankName: String(rank.rankName ?? "Unknown"),
    rankDiv: Number(rank.rankDiv ?? 0),
    kills,
  };
}

export function formatKills(kills: number): string {
  return `累計キル: ${kills.toLocaleString()}`;
}
