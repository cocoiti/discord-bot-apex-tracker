import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { fetchPlayerStats, formatKills } from "../services/apexApi.js";
import { RateLimitError } from "../services/apiRateLimiter.js";
import { ValidationError } from "../utils/validation.js";
import { startSession, hasActiveSession } from "../services/kdTracker.js";
import { calculateRankProgress, formatRankProgress } from "../utils/rankCalculator.js";
import { resolvePlayer } from "../utils/resolvePlayer.js";
import { getActiveDbSession, startDbSession } from "../services/sessionStore.js";

export const data = new SlashCommandBuilder()
  .setName("rankstart")
  .setDescription("キル追跡セッションを開始します")
  .addStringOption((option) =>
    option
      .setName("player")
      .setDescription("プレイヤー名（登録済みなら省略可）")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("platform")
      .setDescription("プラットフォーム")
      .setRequired(false)
      .addChoices(
        { name: "PC", value: "PC" },
        { name: "PlayStation", value: "PS4" },
        { name: "Xbox", value: "X1" },
        { name: "Switch", value: "SWITCH" }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const resolved = await resolvePlayer(interaction);
  if (!resolved) {
    await interaction.editReply(
      "⚠️ プレイヤー名を指定するか、`/register set` でアカウントを登録してください。"
    );
    return;
  }

  const { playerName, platform, fromRegistration } = resolved;

  try {
    // 登録ユーザーはDB永続セッション、未登録はインメモリ
    if (fromRegistration) {
      const existing = await getActiveDbSession(interaction.user.id);
      if (existing) {
        await interaction.editReply(
          `⚠️ **${existing.playerName}** のセッションは既に開始されています。\n終了するには \`/rankend\` を使用してください。`
        );
        return;
      }
    } else {
      if (hasActiveSession(playerName, platform)) {
        await interaction.editReply(
          `⚠️ **${playerName}** のセッションは既に開始されています。\n終了するには \`/rankend\` を使用してください。`
        );
        return;
      }
    }

    const stats = await fetchPlayerStats(playerName, platform);

    if (fromRegistration) {
      await startDbSession(
        interaction.user.id,
        stats.name,
        platform,
        stats.kills,
        stats.currentRP,
        "manual"
      );
    } else {
      startSession(playerName, platform, stats.kills, stats.currentRP);
    }

    const progress = calculateRankProgress(stats.currentRP, stats.rankName, stats.rankDiv);
    const startTimestamp = Math.floor(Date.now() / 1000);

    const lines: string[] = [];
    lines.push(`✅ **${stats.name}** のセッションを開始しました`);
    lines.push(`開始時刻: <t:${startTimestamp}:t>`);
    lines.push("");
    lines.push(formatRankProgress(stats.name, progress).split("\n").slice(1).join("\n"));
    if (stats.kills > 0) {
      lines.push("");
      lines.push(`📊 ${formatKills(stats.kills)}`);
    }

    await interaction.editReply(lines.join("\n"));
  } catch (error) {
    if (error instanceof RateLimitError) {
      await interaction.editReply(`⚠️ ${error.message}`);
      return;
    }
    if (error instanceof ValidationError) {
      await interaction.editReply(`⚠️ ${error.message}`);
      return;
    }
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    await interaction.editReply(`エラー: ${errorMessage}`);
  }
}
