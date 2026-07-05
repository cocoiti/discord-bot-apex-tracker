import { fetchLatestNews, getArticleUrl } from "../services/eaNews.js";

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const limit = args[0] ? parseInt(args[0], 10) : 3;

  if (isNaN(limit) || limit < 1) {
    console.error("Usage: pnpm run news [件数]");
    console.error("  件数: 表示する記事数 (default: 3)");
    process.exit(1);
  }

  try {
    console.log("EA公式ニュースを取得中...\n");
    const articles = await fetchLatestNews(limit);

    if (articles.length === 0) {
      console.log("記事が見つかりませんでした。");
      return;
    }

    for (const article of articles) {
      const publishDate = new Date(article.publishDate);
      const dateStr = `${publishDate.getFullYear()}/${String(publishDate.getMonth() + 1).padStart(2, "0")}/${String(publishDate.getDate()).padStart(2, "0")}`;

      console.log("━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🎮 ${article.title}`);
      console.log(`${article.summary}`);
      console.log("");
      console.log(`🔗 ${getArticleUrl(article.slug)}`);
      console.log(`📅 ${dateStr}`);
      if (article.type) {
        console.log(`📂 ${article.type}`);
      }
      console.log("");
    }

    console.log(`合計 ${articles.length} 件の記事を表示しました。`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("Unknown error occurred");
    }
    process.exit(1);
  }
}

main();
