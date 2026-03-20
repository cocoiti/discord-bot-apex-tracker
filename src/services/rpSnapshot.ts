import { eq, desc } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { rpSnapshots } from "../db/schema.js";

export async function recordSnapshot(
  discordId: string,
  rp: number,
  rankName: string,
  rankDiv: number,
  kills: number
): Promise<void> {
  const db = getDb();
  await db.insert(rpSnapshots).values({
    discordId,
    rp,
    rankName,
    rankDiv,
    kills,
  });
}

export async function getRecentSnapshots(
  discordId: string,
  limit: number = 10
) {
  const db = getDb();
  return db
    .select()
    .from(rpSnapshots)
    .where(eq(rpSnapshots.discordId, discordId))
    .orderBy(desc(rpSnapshots.recordedAt))
    .limit(limit);
}
