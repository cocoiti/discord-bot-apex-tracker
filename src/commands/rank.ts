import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { fetchPlayerStats, formatKills } from "../services/apexApi.js";
import { RateLimitError } from "../services/apiRateLimiter.js";
import { ValidationError } from "../utils/validation.js";
import {
  calculateRankProgress,
  formatRankProgress,
} from "../utils/rankCalculator.js";
import { resolvePlayer } from "../utils/resolvePlayer.js";

export const data = new SlashCommandBuilder()
  .setName("rank")
  .setDescription("Apex Legendsのランク情報を表示します")
  .addStringOption((option) =>
    option
      .setName("player")
      .setDescription("プレイヤー名（登録済みの場合は省略可能）")
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

  const { playerName, platform } = resolved;

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
    if (error instanceof ValidationError) {
      await interaction.editReply(`⚠️ ${error.message}`);
      return;
    }
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    await interaction.editReply(`エラー: ${errorMessage}`);
  }
}
