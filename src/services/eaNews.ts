export interface EaNewsArticle {
  title: string;
  summary: string;
  publishDate: string;
  slug: string;
  type: string;
  imageUrl: string;
}

interface NewsDataImage {
  ar16X9?: string;
  ar1X1?: string;
  [key: string]: unknown;
}

interface NewsDataItem {
  title?: string;
  summary?: string;
  publishingDate?: string;
  slug?: string;
  type?: string;
  image?: NewsDataImage;
}

const EA_NEWS_URL =
  "https://www.ea.com/games/apex-legends/apex-legends/news";

export function parseNewsFromHtml(html: string): EaNewsArticle[] {
  // Format: "newsDataFallback":{"items":[...]}
  const marker = '"newsDataFallback"';
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) {
    throw new Error("newsDataFallback not found in HTML");
  }

  // Find the start of the items array
  const itemsKey = '"items"';
  const itemsKeyIdx = html.indexOf(itemsKey, markerIdx);
  if (itemsKeyIdx === -1) {
    throw new Error("newsDataFallback items not found in HTML");
  }

  const arrayStart = html.indexOf("[", itemsKeyIdx);
  if (arrayStart === -1) {
    throw new Error("newsDataFallback items array not found");
  }

  // Find the matching closing bracket
  let depth = 0;
  let arrayEnd = arrayStart;
  for (let i = arrayStart; i < html.length; i++) {
    if (html[i] === "[") depth++;
    if (html[i] === "]") depth--;
    if (depth === 0) {
      arrayEnd = i + 1;
      break;
    }
  }

  let data: NewsDataItem[];
  try {
    data = JSON.parse(html.substring(arrayStart, arrayEnd));
  } catch {
    throw new Error("Failed to parse newsDataFallback JSON");
  }

  return data.map((item) => {
    const imageUrl = item.image?.ar16X9 ?? item.image?.ar1X1 ?? "";

    return {
      title: item.title ?? "",
      summary: item.summary ?? "",
      publishDate: item.publishingDate ?? "",
      slug: item.slug ?? "",
      type: item.type ?? "",
      imageUrl,
    };
  });
}

export async function fetchLatestNews(
  limit: number = 5
): Promise<EaNewsArticle[]> {
  const response = await fetch(EA_NEWS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch EA news: ${response.status}`);
  }

  const html = await response.text();
  const articles = parseNewsFromHtml(html);

  // Sort by publishDate descending
  articles.sort(
    (a, b) =>
      new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
  );

  return articles.slice(0, limit);
}

export function getArticleUrl(slug: string): string {
  return `https://www.ea.com/games/apex-legends/apex-legends/news/${slug}`;
}
