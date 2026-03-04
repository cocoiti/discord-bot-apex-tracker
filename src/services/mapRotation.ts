import { rateLimitedFetch } from "./apiRateLimiter.js";
import { ApiError } from "./apexApi.js";

export interface MapInfo {
  name: string;
  remainingTime: string;
  remainingMins: number;
}

export interface MapRotation {
  current: MapInfo;
  next: MapInfo;
}

export async function fetchMapRotation(): Promise<MapRotation> {
  const apiKey = process.env.APEX_API_KEY;
  if (!apiKey) {
    throw new ApiError("APEX_API_KEY is not set");
  }

  const params = new URLSearchParams({
    auth: apiKey,
    version: "2",
  });

  const response = await rateLimitedFetch(
    `https://api.mozambiquehe.re/maprotation?${params.toString()}`
  );

  // JSONパースエラーハンドリング
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      "マップローテーション情報を解析できませんでした。",
      response.status
    );
  }

  if (!response.ok) {
    const errorData = data as Record<string, unknown>;
    const errorMessage = errorData?.Error || "Unknown error";
    throw new ApiError(`API request failed: ${response.status} - ${errorMessage}`, response.status);
  }

  const typedData = data as Record<string, unknown>;
  if (typedData.Error) {
    throw new ApiError(String(typedData.Error));
  }

  // 防御的なデータ抽出
  const ranked = typedData.ranked as Record<string, unknown> | undefined;
  if (!ranked) {
    throw new ApiError("ランクマップデータを取得できませんでした。");
  }

  const current = ranked.current as Record<string, unknown> | undefined;
  const next = ranked.next as Record<string, unknown> | undefined;

  if (!current) {
    throw new ApiError("現在のマップ情報を取得できませんでした。");
  }

  return {
    current: {
      name: String(current.map ?? "Unknown"),
      remainingTime: String(current.remainingTimer ?? ""),
      remainingMins: Number(current.remainingMins ?? 0),
    },
    next: {
      name: String(next?.map ?? "Unknown"),
      remainingTime: "",
      remainingMins: 0,
    },
  };
}

export function formatMapStatus(rotation: MapRotation): string {
  return `${rotation.current.name} (残り${rotation.current.remainingTime})`;
}
