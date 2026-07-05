import { describe, it, expect } from "vitest";
import { parseNewsFromHtml, getArticleUrl } from "./eaNews.js";

const mockHtml = `
<html>
<head><title>Apex News</title></head>
<body>
<script>
self.__next_f.push([1,"newsDataFallback":{"items":[
  {
    "title": "Patch Notes 2.30",
    "summary": "Bug fixes and balance changes.",
    "publishingDate": "2026-06-20T10:00:00.000-07:00",
    "slug": "patch-notes-2-30",
    "type": "News Article",
    "image": {"ar16X9": "https://example.com/image1-16x9.jpg", "ar1X1": "https://example.com/image1-1x1.jpg"}
  },
  {
    "title": "Season 30 Launch",
    "summary": "New season is here!",
    "publishingDate": "2026-06-15T08:00:00.000-07:00",
    "slug": "season-30-launch",
    "type": "Game Update",
    "image": {"ar1X1": "https://example.com/image2-1x1.jpg"}
  },
  {
    "title": "Event Announcement",
    "summary": "Limited time event.",
    "publishingDate": "2026-06-10T12:00:00.000-07:00",
    "slug": "event-announcement",
    "type": "News Article",
    "image": {}
  }
]}})
</script>
</body>
</html>
`;

describe("parseNewsFromHtml", () => {
  it("should parse articles from HTML with newsDataFallback", () => {
    const articles = parseNewsFromHtml(mockHtml);
    expect(articles).toHaveLength(3);
    expect(articles[0]).toEqual({
      title: "Patch Notes 2.30",
      summary: "Bug fixes and balance changes.",
      publishDate: "2026-06-20T10:00:00.000-07:00",
      slug: "patch-notes-2-30",
      type: "News Article",
      imageUrl: "https://example.com/image1-16x9.jpg",
    });
  });

  it("should prefer ar16X9 over ar1X1 for image", () => {
    const articles = parseNewsFromHtml(mockHtml);
    expect(articles[0].imageUrl).toBe("https://example.com/image1-16x9.jpg");
  });

  it("should fallback to ar1X1 when ar16X9 is missing", () => {
    const articles = parseNewsFromHtml(mockHtml);
    expect(articles[1].imageUrl).toBe("https://example.com/image2-1x1.jpg");
  });

  it("should handle empty image object", () => {
    const articles = parseNewsFromHtml(mockHtml);
    expect(articles[2].imageUrl).toBe("");
  });

  it("should throw when newsDataFallback is not found", () => {
    expect(() => parseNewsFromHtml("<html></html>")).toThrow(
      "newsDataFallback not found in HTML"
    );
  });

  it("should throw when items array is malformed", () => {
    const badHtml = `"newsDataFallback":{"items":[{invalid json}]}`;
    expect(() => parseNewsFromHtml(badHtml)).toThrow(
      "Failed to parse newsDataFallback JSON"
    );
  });
});

describe("getArticleUrl", () => {
  it("should return the full article URL", () => {
    expect(getArticleUrl("patch-notes-2-30")).toBe(
      "https://www.ea.com/games/apex-legends/apex-legends/news/patch-notes-2-30"
    );
  });
});
