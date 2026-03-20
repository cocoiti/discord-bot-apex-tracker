DROP TABLE "notification_settings";--> statement-breakpoint
CREATE TABLE "guild_settings" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"notify_channel_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
