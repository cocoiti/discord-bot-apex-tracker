import { VoiceState, Client } from "discord.js";
import { getRegistration } from "../services/registration.js";
import { getNotificationConfig } from "../services/notificationSettings.js";
import {
  startDbSession,
  getActiveDbSession,
  endDbSession,
} from "../services/sessionStore.js";
import { fetchPlayerStats } from "../services/apexApi.js";
import { recordSnapshot } from "../services/rpSnapshot.js";
import {
  calculateRankProgress,
  formatRankProgress,
} from "../utils/rankCalculator.js";

function isApexChannel(channelName: string): boolean {
  return channelName.toLowerCase().includes("apex");
}

async function sendDmSafely(
  client: Client,
  userId: string,
  message: string
): Promise<void> {
  try {
    const user = await client.users.fetch(userId);
    await user.send(message);
  } catch (error: unknown) {
    // 50007: Cannot send messages to this user (DM disabled)
    const discordError = error as { code?: number };
    if (discordError.code === 50007) {
      return; // DM無効ユーザーは静かにスキップ
    }
    console.error(`Failed to send DM to ${userId}:`, error);
  }
}

export async function handleVoiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState,
  client: Client
): Promise<void> {
  const userId = newState.id;
  const oldChannel = oldState.channel;
  const newChannel = newState.channel;

  // チャンネル変更がない場合（ミュート/デフェンなど）はスキップ
  if (oldChannel?.id === newChannel?.id) return;

  const wasInApex = oldChannel ? isApexChannel(oldChannel.name) : false;
  const isInApex = newChannel ? isApexChannel(newChannel.name) : false;

  // Apex VC間の移動はセッション継続
  if (wasInApex && isInApex) return;

  // 未登録ユーザーは何もしない
  const reg = await getRegistration(userId);
  if (!reg) return;

  // Apex VCに参加
  if (!wasInApex && isInApex) {
    await handleJoin(client, userId, reg.playerName, reg.platform, newChannel!.name);
    return;
  }

  // Apex VCから退出
  if (wasInApex && !isInApex) {
    await handleLeave(client, userId, reg.playerName, reg.platform);
    return;
  }
}

async function handleJoin(
  client: Client,
  userId: string,
  playerName: string,
  platform: string,
  channelName: string
): Promise<void> {
  try {
    // 既にアクティブなセッションがある場合はスキップ
    const existing = await getActiveDbSession(userId);
    if (existing) return;

    const stats = await fetchPlayerStats(playerName, platform);
    await startDbSession(
      userId,
      stats.name,
      platform,
      stats.kills,
      stats.currentRP,
      "voice",
      channelName
    );

    const config = await getNotificationConfig(userId);
    if (!config.dmOnJoin) return;

    const progress = calculateRankProgress(
      stats.currentRP,
      stats.rankName,
      stats.rankDiv
    );
    const startTimestamp = Math.floor(Date.now() / 1000);

    const lines: string[] = [];
    lines.push(`🎮 **${channelName}** への参加を検出しました`);
    lines.push(`セッションを自動開始しました（<t:${startTimestamp}:t>）`);
    lines.push("");
    lines.push(
      formatRankProgress(stats.name, progress)
        .split("\n")
        .slice(1)
        .join("\n")
    );

    await sendDmSafely(client, userId, lines.join("\n"));
  } catch (error) {
    console.error(`Failed to start voice session for ${userId}:`, error);
  }
}

async function handleLeave(
  client: Client,
  userId: string,
  playerName: string,
  platform: string
): Promise<void> {
  try {
    const activeSession = await getActiveDbSession(userId);
    if (!activeSession) return;

    const stats = await fetchPlayerStats(playerName, platform);
    const result = await endDbSession(userId, stats.kills, stats.currentRP);
    if (!result) return;

    // RP推移スナップショットを記録
    await recordSnapshot(
      userId,
      stats.currentRP,
      stats.rankName,
      stats.rankDiv,
      stats.kills
    );

    const config = await getNotificationConfig(userId);
    if (!config.dmOnLeave) return;

    const progress = calculateRankProgress(
      stats.currentRP,
      stats.rankName,
      stats.rankDiv
    );
    const startTimestamp = Math.floor(result.startTime.getTime() / 1000);
    const endTimestamp = Math.floor(Date.now() / 1000);
    const rpSign = (result.rpChange ?? 0) >= 0 ? "+" : "";

    const lines: string[] = [];
    lines.push(`🏁 セッション結果 (**${stats.name}**)`);
    lines.push(`<t:${startTimestamp}:t> → <t:${endTimestamp}:t>`);
    lines.push("");
    lines.push(`**セッション成績**`);
    lines.push(`キル: **${result.killsGained ?? 0}**`);
    lines.push(
      `RP: ${result.startRp} → ${result.endRp} (**${rpSign}${result.rpChange}**)`
    );
    lines.push("");
    lines.push(
      formatRankProgress(stats.name, progress)
        .split("\n")
        .slice(1)
        .join("\n")
    );

    await sendDmSafely(client, userId, lines.join("\n"));
  } catch (error) {
    console.error(`Failed to end voice session for ${userId}:`, error);
  }
}
