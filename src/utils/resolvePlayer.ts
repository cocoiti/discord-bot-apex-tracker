import { ChatInputCommandInteraction } from "discord.js";
import { getRegistration } from "../services/registration.js";

export interface ResolvedPlayer {
  playerName: string;
  platform: string;
  fromRegistration: boolean;
}

export async function resolvePlayer(
  interaction: ChatInputCommandInteraction
): Promise<ResolvedPlayer | null> {
  const playerName = interaction.options.getString("player");
  const platform = interaction.options.getString("platform");

  // 明示的に指定されている場合はそちらを優先
  if (playerName) {
    return {
      playerName,
      platform: platform || "PC",
      fromRegistration: false,
    };
  }

  // 登録情報からフォールバック
  const reg = await getRegistration(interaction.user.id);
  if (reg) {
    return {
      playerName: reg.playerName,
      platform: platform || reg.platform,
      fromRegistration: true,
    };
  }

  return null;
}
