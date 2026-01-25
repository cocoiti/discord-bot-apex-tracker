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
    throw new Error("APEX_API_KEY is not set");
  }

  const response = await fetch(
    `https://api.mozambiquehe.re/maprotation?auth=${apiKey}&version=2`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} - ${JSON.stringify(data)}`);
  }

  if (data.Error) {
    throw new Error(data.Error);
  }

  return {
    current: {
      name: data.battle_royale.current.map,
      remainingTime: data.battle_royale.current.remainingTimer,
      remainingMins: data.battle_royale.current.remainingMins,
    },
    next: {
      name: data.battle_royale.next.map,
      remainingTime: "",
      remainingMins: 0,
    },
  };
}

export function formatMapStatus(rotation: MapRotation): string {
  return `${rotation.current.name} (残り${rotation.current.remainingTime})`;
}
