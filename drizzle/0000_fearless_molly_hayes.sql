CREATE TABLE "notification_settings" (
	"discord_id" text PRIMARY KEY NOT NULL,
	"dm_on_join" boolean DEFAULT true NOT NULL,
	"dm_on_leave" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"discord_id" text PRIMARY KEY NOT NULL,
	"player_name" text NOT NULL,
	"platform" text DEFAULT 'PC' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rp_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" text NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"rp" integer NOT NULL,
	"rank_name" text NOT NULL,
	"rank_div" integer NOT NULL,
	"kills" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" text NOT NULL,
	"player_name" text NOT NULL,
	"platform" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"start_kills" integer NOT NULL,
	"start_rp" integer NOT NULL,
	"end_time" timestamp,
	"end_kills" integer,
	"end_rp" integer,
	"rp_change" integer,
	"kills_gained" integer,
	"source" text DEFAULT 'manual' NOT NULL,
	"channel_name" text
);
--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_discord_id_registrations_discord_id_fk" FOREIGN KEY ("discord_id") REFERENCES "public"."registrations"("discord_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rp_snapshots" ADD CONSTRAINT "rp_snapshots_discord_id_registrations_discord_id_fk" FOREIGN KEY ("discord_id") REFERENCES "public"."registrations"("discord_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_discord_id_registrations_discord_id_fk" FOREIGN KEY ("discord_id") REFERENCES "public"."registrations"("discord_id") ON DELETE cascade ON UPDATE no action;