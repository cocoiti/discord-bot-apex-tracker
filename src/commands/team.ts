import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("team")
  .setDescription("VCメンバーをランダムにチーム分けします")
  .addIntegerOption((option) =>
    option
      .setName("size")
      .setDescription("1チームの人数（デフォルト: 3）")
      .setMinValue(2)
      .setMaxValue(10)
  );

const TEAM_ICONS = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠", "⚪", "🟤"];

/** Fisher-Yates shuffle */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    await interaction.reply({
      content: "ボイスチャンネルに参加してから実行してください",
      ephemeral: true,
    });
    return;
  }

  const members = [...voiceChannel.members.values()].filter((m) => !m.user.bot);

  if (members.length < 2) {
    await interaction.reply({
      content: "チーム分けするには2人以上のメンバーが必要です",
      ephemeral: true,
    });
    return;
  }

  const teamSize = interaction.options.getInteger("size") ?? 3;
  const shuffled = shuffle(members);
  const teams: GuildMember[][] = [];

  for (let i = 0; i < shuffled.length; i += teamSize) {
    teams.push(shuffled.slice(i, i + teamSize));
  }

  // 端数が出た場合、最後のチームが1人だけなら前のチームに合流
  if (teams.length > 1 && teams[teams.length - 1].length === 1) {
    const lastMember = teams.pop()![0];
    teams[teams.length - 1].push(lastMember);
  }

  const lines: string[] = [];
  lines.push(`🎲 チーム分け（${members.length}人 → ${teams.length}チーム）`);

  for (let i = 0; i < teams.length; i++) {
    lines.push("");
    const icon = TEAM_ICONS[i % TEAM_ICONS.length];
    lines.push(`${icon} チーム${i + 1}`);
    for (const m of teams[i]) {
      lines.push(`- ${m.displayName}`);
    }
  }

  await interaction.reply(lines.join("\n"));
}
