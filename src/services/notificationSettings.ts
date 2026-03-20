import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { notificationSettings } from "../db/schema.js";

export interface NotificationConfig {
  dmOnJoin: boolean;
  dmOnLeave: boolean;
}

const DEFAULT_CONFIG: NotificationConfig = {
  dmOnJoin: true,
  dmOnLeave: true,
};

export async function getNotificationConfig(
  discordId: string
): Promise<NotificationConfig> {
  const db = getDb();
  const result = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.discordId, discordId))
    .limit(1);
  return result[0] ?? DEFAULT_CONFIG;
}

export async function setNotificationConfig(
  discordId: string,
  config: Partial<NotificationConfig>
): Promise<NotificationConfig> {
  const db = getDb();

  const updateSet: Record<string, boolean> = {};
  if (config.dmOnJoin !== undefined) updateSet.dmOnJoin = config.dmOnJoin;
  if (config.dmOnLeave !== undefined) updateSet.dmOnLeave = config.dmOnLeave;

  const result = await db
    .insert(notificationSettings)
    .values({
      discordId,
      dmOnJoin: config.dmOnJoin ?? true,
      dmOnLeave: config.dmOnLeave ?? true,
    })
    .onConflictDoUpdate({
      target: notificationSettings.discordId,
      set: updateSet,
    })
    .returning();
  return result[0];
}
