import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { fetchPlayerStats } from "../services/apexApi.js";
import { RateLimitError } from "../services/apiRateLimiter.js";
import { ValidationError } from "../utils/validation.js";
import {
  getRegistration,
  setRegistration,
  deleteRegistration,
} from "../services/registration.js";

export const data = new SlashCommandBuilder()
  .setName("register")
  .setDescription("Apexアカウントを登録・管理します")
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("Apexアカウントを登録します")
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
      )
  )
  .addSubcommand((sub) =>
    sub.setName("show").setDescription("登録情報を表示します")
  )
  .addSubcommand((sub) =>
    sub.setName("delete").setDescription("登録情報を削除します")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case "set":
      return handleSet(interaction);
    case "show":
      return handleShow(interaction);
    case "delete":
      return handleDelete(interaction);
  }
}

async function handleSet(interaction: ChatInputCommandInteraction) {
  const playerName = interaction.options.getString("player", true);
  const platform = interaction.options.getString("platform") || "PC";

  await interaction.deferReply({ ephemeral: true });

  try {
    // APIでアカウント存在確認
    const stats = await fetchPlayerStats(playerName, platform);

    await setRegistration(interaction.user.id, stats.name, platform);

    await interaction.editReply(
      `✅ アカウントを登録しました\nプレイヤー: **${stats.name}**\nプラットフォーム: **${platform}**`
    );
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

async function handleShow(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const reg = await getRegistration(interaction.user.id);
  if (!reg) {
    await interaction.editReply(
      "アカウントが登録されていません。`/register set` で登録してください。"
    );
    return;
  }

  await interaction.editReply(
    `📋 登録情報\nプレイヤー: **${reg.playerName}**\nプラットフォーム: **${reg.platform}**`
  );
}

async function handleDelete(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const deleted = await deleteRegistration(interaction.user.id);
  if (!deleted) {
    await interaction.editReply("登録情報が見つかりませんでした。");
    return;
  }

  await interaction.editReply("✅ 登録情報を削除しました。");
}
