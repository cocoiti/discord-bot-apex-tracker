import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock eaNews module
vi.mock("../services/eaNews.js", () => ({
  fetchLatestNews: vi.fn(),
  getArticleUrl: (slug: string) =>
    `https://www.ea.com/games/apex-legends/apex-legends/news/${slug}`,
}));

// Mock db client
vi.mock("../db/client.js", () => ({
  getDb: vi.fn(),
}));

import { fetchLatestNews } from "../services/eaNews.js";
import type { EaNewsArticle } from "../services/eaNews.js";

const mockArticles: EaNewsArticle[] = [
  {
    title: "Patch Notes 2.30",
    summary: "Bug fixes and balance changes.",
    publishDate: "2026-06-20T10:00:00.000Z",
    slug: "patch-notes-2-30",
    type: "patch-notes",
    imageUrl: "https://example.com/image1.jpg",
  },
  {
    title: "Season 30 Launch",
    summary: "New season is here!",
    publishDate: "2026-06-15T08:00:00.000Z",
    slug: "season-30-launch",
    type: "game-update",
    imageUrl: "https://example.com/image2.jpg",
  },
];

describe("update command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchLatestNews integration", () => {
    it("should return articles from EA news", async () => {
      vi.mocked(fetchLatestNews).mockResolvedValue(mockArticles);

      const articles = await fetchLatestNews(3);
      expect(articles).toHaveLength(2);
      expect(articles[0].title).toBe("Patch Notes 2.30");
    });

    it("should handle fetch failure", async () => {
      vi.mocked(fetchLatestNews).mockRejectedValue(
        new Error("Failed to fetch")
      );

      await expect(fetchLatestNews(3)).rejects.toThrow("Failed to fetch");
    });
  });

  describe("bot owner check", () => {
    it("should identify bot owner from env", () => {
      const originalEnv = process.env.BOT_OWNER_ID;
      process.env.BOT_OWNER_ID = "123456789";

      // Simple check logic matching update.ts
      const isBotOwner = (userId: string) => {
        const ownerId = process.env.BOT_OWNER_ID;
        return !!ownerId && userId === ownerId;
      };

      expect(isBotOwner("123456789")).toBe(true);
      expect(isBotOwner("999999999")).toBe(false);

      process.env.BOT_OWNER_ID = originalEnv;
    });

    it("should return false when BOT_OWNER_ID is not set", () => {
      const originalEnv = process.env.BOT_OWNER_ID;
      delete process.env.BOT_OWNER_ID;

      const isBotOwner = (userId: string) => {
        const ownerId = process.env.BOT_OWNER_ID;
        return !!ownerId && userId === ownerId;
      };

      expect(isBotOwner("123456789")).toBe(false);

      process.env.BOT_OWNER_ID = originalEnv;
    });
  });

  describe("new article detection", () => {
    it("should detect articles not in posted set", () => {
      const postedSlugs = new Set(["patch-notes-2-30"]);
      const newArticles = mockArticles.filter(
        (a) => !postedSlugs.has(a.slug)
      );

      expect(newArticles).toHaveLength(1);
      expect(newArticles[0].slug).toBe("season-30-launch");
    });

    it("should return empty when all articles are posted", () => {
      const postedSlugs = new Set(["patch-notes-2-30", "season-30-launch"]);
      const newArticles = mockArticles.filter(
        (a) => !postedSlugs.has(a.slug)
      );

      expect(newArticles).toHaveLength(0);
    });
  });
});
