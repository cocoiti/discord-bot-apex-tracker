export interface SessionData {
  playerName: string;
  platform: string;
  startTime: Date;
  startKills: number;
  startRP: number;
}

export interface SessionResult {
  playerName: string;
  startTime: Date;
  endTime: Date;
  kills: number;
  startRP: number;
  endRP: number;
  rpChange: number;
}

// In-memory storage for active sessions
const sessions = new Map<string, SessionData>();

function getSessionKey(playerName: string, platform: string): string {
  return `${playerName.toLowerCase()}_${platform.toLowerCase()}`;
}

export function startSession(
  playerName: string,
  platform: string,
  currentKills: number,
  currentRP: number
): void {
  const key = getSessionKey(playerName, platform);
  sessions.set(key, {
    playerName,
    platform,
    startTime: new Date(),
    startKills: currentKills,
    startRP: currentRP,
  });
}

export function getSession(playerName: string, platform: string): SessionData | null {
  const key = getSessionKey(playerName, platform);
  return sessions.get(key) || null;
}

export function endSession(
  playerName: string,
  platform: string,
  currentKills: number,
  currentRP: number
): SessionResult | null {
  const key = getSessionKey(playerName, platform);
  const session = sessions.get(key);

  if (!session) {
    return null;
  }

  sessions.delete(key);

  const kills = currentKills - session.startKills;
  const rpChange = currentRP - session.startRP;

  return {
    playerName: session.playerName,
    startTime: session.startTime,
    endTime: new Date(),
    kills,
    startRP: session.startRP,
    endRP: currentRP,
    rpChange,
  };
}

export function hasActiveSession(playerName: string, platform: string): boolean {
  const key = getSessionKey(playerName, platform);
  return sessions.has(key);
}

export function formatSessionResult(result: SessionResult): string {
  const startTimeStr = result.startTime.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const rpSign = result.rpChange >= 0 ? "+" : "";

  const lines: string[] = [];
  lines.push(`**${result.playerName}** のセッション結果`);
  lines.push(`開始: ${startTimeStr}`);
  lines.push("");
  lines.push(`セッションキル: **${result.kills}**`);
  lines.push(`RP: ${result.startRP} → ${result.endRP} (**${rpSign}${result.rpChange}**)`);

  return lines.join("\n");
}
