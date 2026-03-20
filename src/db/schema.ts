import { pgTable, text, integer, timestamp, serial, boolean } from "drizzle-orm/pg-core";

export const registrations = pgTable("registrations", {
  discordId: text("discord_id").primaryKey(),
  playerName: text("player_name").notNull(),
  platform: text("platform").notNull().default("PC"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id")
    .notNull()
    .references(() => registrations.discordId, { onDelete: "cascade" }),
  playerName: text("player_name").notNull(),
  platform: text("platform").notNull(),
  startTime: timestamp("start_time").notNull(),
  startKills: integer("start_kills").notNull(),
  startRp: integer("start_rp").notNull(),
  endTime: timestamp("end_time"),
  endKills: integer("end_kills"),
  endRp: integer("end_rp"),
  rpChange: integer("rp_change"),
  killsGained: integer("kills_gained"),
  source: text("source").notNull().default("manual"), // 'manual' | 'voice'
  channelName: text("channel_name"),
});

export const notificationSettings = pgTable("notification_settings", {
  discordId: text("discord_id")
    .primaryKey()
    .references(() => registrations.discordId, { onDelete: "cascade" }),
  dmOnJoin: boolean("dm_on_join").notNull().default(true),
  dmOnLeave: boolean("dm_on_leave").notNull().default(true),
});

export const rpSnapshots = pgTable("rp_snapshots", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id")
    .notNull()
    .references(() => registrations.discordId, { onDelete: "cascade" }),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  rp: integer("rp").notNull(),
  rankName: text("rank_name").notNull(),
  rankDiv: integer("rank_div").notNull(),
  kills: integer("kills").notNull(),
});
