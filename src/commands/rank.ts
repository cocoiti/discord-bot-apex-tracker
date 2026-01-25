import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { fetchPlayerStats, formatKills } from "../services/apexApi.js";
import { RateLimitError } from "../services/apiRateLimiter.js";
import {
  calculateRankProgress,
  formatRankProgress,
} from "../utils/rankCalculator.js";

export const data = new SlashCommandBuilder()
  .setName("rank")
  .setDescription("Apex Legendsのランク情報を表示します")
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
    const stats = await fetchPlayerStats(playerName, platform);
    const progress = calculateRankProgress(stats.currentRP, stats.rankName, stats.rankDiv);
    let message = formatRankProgress(stats.name, progress);

    // Add kills information
    if (stats.kills > 0) {
      message += `\n\n📊 ${formatKills(stats.kills)}`;
    }

    await interaction.editReply(message);
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
