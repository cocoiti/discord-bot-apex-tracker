CREATE TABLE IF NOT EXISTS "news_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_slug" text NOT NULL,
	"article_title" text NOT NULL,
	"published_at" timestamp NOT NULL,
	"posted_at" timestamp DEFAULT now() NOT NULL,
	"success_count" integer NOT NULL DEFAULT 0,
	"fail_count" integer NOT NULL DEFAULT 0,
	CONSTRAINT "news_posts_article_slug_unique" UNIQUE("article_slug")
);
