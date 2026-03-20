import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { guildSettings } from "../db/schema.js";

export async function getNotifyChannelId(
  guildId: string
): Promise<string | null> {
  const db = getDb();
  const result = await db
    .select()
    .from(guildSettings)
    .where(eq(guildSettings.guildId, guildId))
    .limit(1);
  return result[0]?.notifyChannelId ?? null;
}

export async function setNotifyChannelId(
  guildId: string,
  channelId: string | null
): Promise<void> {
  const db = getDb();
  await db
    .insert(guildSettings)
    .values({
      guildId,
      notifyChannelId: channelId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: guildSettings.guildId,
      set: {
        notifyChannelId: channelId,
        updatedAt: new Date(),
      },
    });
}
