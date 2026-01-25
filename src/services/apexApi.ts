export interface ApexPlayerStats {
  name: string;
  platform: string;
  level: number;
  currentRP: number;
  rankName: string;
  rankDiv: number;
}

export async function fetchPlayerStats(
  playerName: string,
  platform: string = "PC"
): Promise<ApexPlayerStats> {
  const apiKey = process.env.APEX_API_KEY;
  if (!apiKey) {
    throw new Error("APEX_API_KEY is not set");
  }

  const params = new URLSearchParams({
    auth: apiKey,
    player: playerName,
    platform: platform,
  });

  const response = await fetch(
    `https://api.mozambiquehe.re/bridge?${params.toString()}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} - ${JSON.stringify(data)}`);
  }

  if (data.Error) {
    throw new Error(data.Error);
  }

  return {
    name: data.global.name,
    platform: data.global.platform,
    level: data.global.level,
    currentRP: data.global.rank.rankScore,
    rankName: data.global.rank.rankName,
    rankDiv: data.global.rank.rankDiv,
  };
}
