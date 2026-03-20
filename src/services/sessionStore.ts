import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { sessions } from "../db/schema.js";

export interface DbSession {
  id: number;
  discordId: string;
  playerName: string;
  platform: string;
  startTime: Date;
  startKills: number;
  startRp: number;
  endTime: Date | null;
  endKills: number | null;
  endRp: number | null;
  rpChange: number | null;
  killsGained: number | null;
  source: string;
  channelName: string | null;
}

export async function startDbSession(
  discordId: string,
  playerName: string,
  platform: string,
  startKills: number,
  startRp: number,
  source: "manual" | "voice" = "manual",
  channelName?: string
): Promise<DbSession> {
  const db = getDb();
  const result = await db
    .insert(sessions)
    .values({
      discordId,
      playerName,
      platform,
      startTime: new Date(),
      startKills,
      startRp,
      source,
      channelName: channelName ?? null,
    })
    .returning();
  return result[0];
}

export async function getActiveDbSession(
  discordId: string
): Promise<DbSession | null> {
  const db = getDb();
  const result = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.discordId, discordId), isNull(sessions.endTime)))
    .limit(1);
  return result[0] ?? null;
}

export async function endDbSession(
  discordId: string,
  endKills: number,
  endRp: number
): Promise<DbSession | null> {
  const session = await getActiveDbSession(discordId);
  if (!session) return null;

  const killsGained = endKills - session.startKills;
  const rpChange = endRp - session.startRp;

  const db = getDb();
  const result = await db
    .update(sessions)
    .set({
      endTime: new Date(),
      endKills,
      endRp,
      rpChange,
      killsGained,
    })
    .where(eq(sessions.id, session.id))
    .returning();
  return result[0] ?? null;
}
