import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Client,
  TextChannel,
} from "discord.js";
import {
  fetchLatestNews,
  getArticleUrl,
  EaNewsArticle,
} from "../services/eaNews.js";
import { getDb } from "../db/client.js";
import { newsPosts } from "../db/schema.js";
import { guildSettings } from "../db/schema.js";
import { isNotNull } from "drizzle-orm";

const APEX_RED = 0xda292a;

export const data = new SlashCommandBuilder()
  .setName("update")
  .setDescription("Apex Legendsのアップデート情報を表示します")
  .addSubcommand((sub) =>
    sub.setName("latest").setDescription("最新のアップデート情報を表示します")
  )
  .addSubcommand((sub) =>
    sub
      .setName("check")
      .setDescription("新着記事をチェックして全サーバーに配信します（Bot Owner のみ）")
  )
  .addSubcommand((sub) =>
    sub
      .setName("auto")
      .setDescription("自動チェックの有効/無効を切り替えます（Bot Owner のみ）")
      .addStringOption((option) =>
        option
          .setName("toggle")
          .setDescription("on または off")
          .setRequired(true)
          .addChoices(
            { name: "on", value: "on" },
            { name: "off", value: "off" }
          )
      )
  );

// Auto-check state (memory only, default ON)
let autoCheckEnabled = true;

export function isAutoCheckEnabled(): boolean {
  return autoCheckEnabled;
}

function isBotOwner(userId: string): boolean {
  const ownerId = process.env.BOT_OWNER_ID;
  return !!ownerId && userId === ownerId;
}

function buildArticleEmbed(article: EaNewsArticle): EmbedBuilder {
  const url = getArticleUrl(article.slug);
  const publishDate = new Date(article.publishDate);
  const dateStr = `${publishDate.getFullYear()}/${String(publishDate.getMonth() + 1).padStart(2, "0")}/${String(publishDate.getDate()).padStart(2, "0")}`;

  const embed = new EmbedBuilder()
    .setTitle(article.title)
    .setDescription(article.summary)
    .setURL(url)
    .setColor(APEX_RED)
    .setFooter({ text: dateStr });

  if (article.imageUrl) {
    embed.setThumbnail(article.imageUrl);
  }

  return embed;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "latest") {
    await handleLatest(interaction);
    return;
  }

  if (!isBotOwner(interaction.user.id)) {
    await interaction.reply({
      content: "このコマンドはBot Ownerのみ実行できます。",
      ephemeral: true,
    });
    return;
  }

  if (subcommand === "check") {
    await handleCheck(interaction);
  } else if (subcommand === "auto") {
    await handleAuto(interaction);
  }
}

async function handleLatest(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const articles = await fetchLatestNews(3);
    if (articles.length === 0) {
      await interaction.editReply("記事が見つかりませんでした。");
      return;
    }

    const embeds = articles.map(buildArticleEmbed);
    await interaction.editReply({ embeds });
  } catch (error) {
    console.error("Failed to fetch latest news:", error);
    await interaction.editReply(
      "ニュース情報の取得に失敗しました。しばらく待ってから再度お試しください。"
    );
  }
}

async function handleCheck(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const result = await checkAndBroadcastNews(interaction.client);
    await interaction.editReply(
      `新着チェック完了: ${result.newCount}件の新着記事を${result.successGuilds}サーバーに配信しました。(失敗: ${result.failGuilds})`
    );
  } catch (error) {
    console.error("Failed to check news:", error);
    await interaction.editReply("新着チェックに失敗しました。");
  }
}

async function handleAuto(interaction: ChatInputCommandInteraction) {
  const toggle = interaction.options.getString("toggle", true);
  autoCheckEnabled = toggle === "on";
  await interaction.reply({
    content: `自動チェックを **${autoCheckEnabled ? "有効" : "無効"}** にしました。`,
    ephemeral: true,
  });
}

export async function checkAndBroadcastNews(
  client: Client
): Promise<{ newCount: number; successGuilds: number; failGuilds: number }> {
  const articles = await fetchLatestNews(10);
  const db = getDb();

  // Get already posted slugs
  const postedRows = await db
    .select({ slug: newsPosts.articleSlug })
    .from(newsPosts);
  const postedSlugs = new Set(postedRows.map((r) => r.slug));

  // Filter to new articles only
  const newArticles = articles.filter((a) => !postedSlugs.has(a.slug));
  if (newArticles.length === 0) {
    return { newCount: 0, successGuilds: 0, failGuilds: 0 };
  }

  // Get all guilds with notify_channel_id set
  const guildsWithNotify = await db
    .select({
      guildId: guildSettings.guildId,
      notifyChannelId: guildSettings.notifyChannelId,
    })
    .from(guildSettings)
    .where(isNotNull(guildSettings.notifyChannelId));

  let totalSuccess = 0;
  let totalFail = 0;

  // Send to each guild
  for (const article of newArticles) {
    const embed = buildArticleEmbed(article);
    let success = 0;
    let fail = 0;

    for (const guild of guildsWithNotify) {
      try {
        const channel = await client.channels.fetch(guild.notifyChannelId!);
        if (channel?.isTextBased()) {
          await (channel as TextChannel).send({ embeds: [embed] });
          success++;
        } else {
          fail++;
        }
      } catch {
        fail++;
      }
    }

    totalSuccess = Math.max(totalSuccess, success);
    totalFail = Math.max(totalFail, fail);

    // Record to DB
    await db.insert(newsPosts).values({
      articleSlug: article.slug,
      articleTitle: article.title,
      publishedAt: new Date(article.publishDate),
      successCount: success,
      failCount: fail,
    });
  }

  return {
    newCount: newArticles.length,
    successGuilds: totalSuccess,
    failGuilds: totalFail,
  };
}
