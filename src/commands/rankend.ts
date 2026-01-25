import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { fetchPlayerStats, formatKills } from "../services/apexApi.js";
import { RateLimitError } from "../services/apiRateLimiter.js";
import { endSession, hasActiveSession } from "../services/kdTracker.js";
import { calculateRankProgress, formatRankProgress } from "../utils/rankCalculator.js";

export const data = new SlashCommandBuilder()
  .setName("rankend")
  .setDescription("キル追跡セッションを終了し結果を表示します")
  .addStringOption((option) =>
    option
      .setName("player")
      .setDescription("プレイヤー名")
      .setRequired(true)
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
  const playerName = interaction.options.getString("player", true);
  const platform = interaction.options.getString("platform") || "PC";

  await interaction.deferReply();

  try {
    if (!hasActiveSession(playerName, platform)) {
      await interaction.editReply(
        `⚠️ **${playerName}** のセッションが見つかりません。\n\`/rankstart\` で開始してください。`
      );
      return;
    }

    const stats = await fetchPlayerStats(playerName, platform);
    const result = endSession(playerName, platform, stats.kills, stats.currentRP);

    if (!result) {
      await interaction.editReply("セッションの終了中にエラーが発生しました。");
      return;
    }

    const progress = calculateRankProgress(stats.currentRP, stats.rankName, stats.rankDiv);
    const startTimeStr = result.startTime.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endTimeStr = result.endTime.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const rpSign = result.rpChange >= 0 ? "+" : "";

    const lines: string[] = [];
    lines.push(`🏁 **${stats.name}** のセッション結果`);
    lines.push(`${startTimeStr} → ${endTimeStr}`);
    lines.push("");
    lines.push(`**セッション成績**`);
    lines.push(`キル: **${result.kills}**`);
    lines.push(`RP: ${result.startRP} → ${result.endRP} (**${rpSign}${result.rpChange}**)`);
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
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    await interaction.editReply(`エラー: ${errorMessage}`);
  }
}
