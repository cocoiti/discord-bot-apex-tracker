import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  version as djsVersion,
} from "discord.js";
import pkg from "../../package.json" with { type: "json" };

export const data = new SlashCommandBuilder()
  .setName("version")
  .setDescription("Botのバージョン情報を表示します");

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}日`);
  if (hours > 0) parts.push(`${hours}時間`);
  parts.push(`${minutes}分`);
  return parts.join("");
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const uptime = formatUptime(process.uptime());
  const message = [
    `🤖 **Apex Tracker Bot**`,
    `Bot: v${pkg.version}`,
    `Node.js: ${process.version}`,
    `discord.js: v${djsVersion}`,
    `稼働時間: ${uptime}`,
  ].join("\n");

  await interaction.reply(message);
}
