import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { fetchPlayerStats, formatKills } from "../services/apexApi.js";
import { RateLimitError } from "../services/apiRateLimiter.js";
import { ValidationError } from "../utils/validation.js";
import { calculateRankProgress, formatRankProgress } from "../utils/rankCalculator.js";
import { resolvePlayer } from "../utils/resolvePlayer.js";
import { getActiveDbSession, endDbSession } from "../services/sessionStore.js";
import { recordSnapshot } from "../services/rpSnapshot.js";
import { getRegistration } from "../services/registration.js";

export const data = new SlashCommandBuilder()
  .setName("rankend")
  .setDescription("キル追跡セッションを終了し結果を表示します")
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

  const { playerName, platform } = resolved;

  try {
    const activeSession = await getActiveDbSession(interaction.user.id);
    if (!activeSession) {
      await interaction.editReply(
        `⚠️ **${playerName}** のセッションが見つかりません。\n\`/rankstart\` で開始してください。`
      );
      return;
    }

    const stats = await fetchPlayerStats(playerName, platform);
    const result = await endDbSession(interaction.user.id, stats.kills, stats.currentRP);

    if (!result) {
      await interaction.editReply("セッションの終了中にエラーが発生しました。");
      return;
    }

    // 登録ユーザーのみRP推移スナップショットを記録
    const reg = await getRegistration(interaction.user.id);
    if (reg) {
      await recordSnapshot(
        interaction.user.id,
        stats.currentRP,
        stats.rankName,
        stats.rankDiv,
        stats.kills
      );
    }

    const progress = calculateRankProgress(stats.currentRP, stats.rankName, stats.rankDiv);
    const startTimestamp = Math.floor(result.startTime.getTime() / 1000);
    const endTimestamp = Math.floor(Date.now() / 1000);
    const rpSign = (result.rpChange ?? 0) >= 0 ? "+" : "";

    const lines: string[] = [];
    lines.push(`🏁 **${stats.name}** のセッション結果`);
    lines.push(`<t:${startTimestamp}:t> → <t:${endTimestamp}:t>`);
    lines.push("");
    lines.push(`**セッション成績**`);
    lines.push(`キル: **${result.killsGained ?? 0}**`);
    lines.push(`RP: ${result.startRp} → ${result.endRp} (**${rpSign}${result.rpChange}**)`);
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
