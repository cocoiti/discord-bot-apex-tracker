import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { registrations } from "../db/schema.js";

export interface Registration {
  discordId: string;
  playerName: string;
  platform: string;
}

export async function getRegistration(
  discordId: string
): Promise<Registration | null> {
  const db = getDb();
  const result = await db
    .select()
    .from(registrations)
    .where(eq(registrations.discordId, discordId))
    .limit(1);
  return result[0] ?? null;
}

export async function setRegistration(
  discordId: string,
  playerName: string,
  platform: string
): Promise<void> {
  const db = getDb();
  await db
    .insert(registrations)
    .values({
      discordId,
      playerName,
      platform,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: registrations.discordId,
      set: {
        playerName,
        platform,
        updatedAt: new Date(),
      },
    });
}

export async function deleteRegistration(discordId: string): Promise<boolean> {
  const db = getDb();
  const result = await db
    .delete(registrations)
    .where(eq(registrations.discordId, discordId))
    .returning();
  return result.length > 0;
}
