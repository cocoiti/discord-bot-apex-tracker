import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { getRegistration } from "../services/registration.js";
import {
  getNotificationConfig,
  setNotificationConfig,
} from "../services/notificationSettings.js";

export const data = new SlashCommandBuilder()
  .setName("notify")
  .setDescription("ボイスチャット自動トラッキングの通知設定を変更します")
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("通知タイプ")
      .setRequired(true)
      .addChoices(
        { name: "参加時DM", value: "join" },
        { name: "退出時DM", value: "leave" },
        { name: "すべて", value: "all" }
      )
  )
  .addBooleanOption((option) =>
    option
      .setName("enabled")
      .setDescription("有効/無効")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const reg = await getRegistration(interaction.user.id);
  if (!reg) {
    await interaction.editReply(
      "アカウントが登録されていません。先に `/register set` で登録してください。"
    );
    return;
  }

  const type = interaction.options.getString("type", true);
  const enabled = interaction.options.getBoolean("enabled", true);

  const update: { dmOnJoin?: boolean; dmOnLeave?: boolean } = {};
  if (type === "join" || type === "all") update.dmOnJoin = enabled;
  if (type === "leave" || type === "all") update.dmOnLeave = enabled;

  const config = await setNotificationConfig(interaction.user.id, update);

  const status = [
    `参加時DM: ${config.dmOnJoin ? "✅ ON" : "❌ OFF"}`,
    `退出時DM: ${config.dmOnLeave ? "✅ ON" : "❌ OFF"}`,
  ].join("\n");

  await interaction.editReply(`🔔 通知設定を更新しました\n${status}`);
}
