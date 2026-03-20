import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import {
  getNotifyChannelId,
  setNotifyChannelId,
} from "../services/guildSettings.js";

export const data = new SlashCommandBuilder()
  .setName("notify")
  .setDescription("ボイスチャット自動トラッキングの通知チャンネルを設定します")
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("通知先チャンネルを設定します")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("通知を送信するテキストチャンネル")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("show").setDescription("現在の通知設定を表示します")
  )
  .addSubcommand((sub) =>
    sub.setName("off").setDescription("通知を無効化します")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply("このコマンドはサーバー内でのみ使用できます。");
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "show") {
    const channelId = await getNotifyChannelId(guildId);
    if (channelId) {
      await interaction.editReply(`現在の通知チャンネル: <#${channelId}>`);
    } else {
      await interaction.editReply("通知チャンネルは設定されていません。");
    }
    return;
  }

  // set / off は ManageGuild 権限が必要
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.editReply(
      "この操作には「サーバーの管理」権限が必要です。"
    );
    return;
  }

  if (subcommand === "set") {
    const channel = interaction.options.getChannel("channel", true);
    await setNotifyChannelId(guildId, channel.id);
    await interaction.editReply(
      `通知チャンネルを <#${channel.id}> に設定しました。`
    );
    return;
  }

  if (subcommand === "off") {
    await setNotifyChannelId(guildId, null);
    await interaction.editReply("通知を無効化しました。");
    return;
  }
}
