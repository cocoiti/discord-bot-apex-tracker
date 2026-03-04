import "dotenv/config";
import { Client, GatewayIntentBits, REST, Routes, ActivityType } from "discord.js";
import * as rankCommand from "./commands/rank.js";
import * as rankstartCommand from "./commands/rankstart.js";
import * as rankendCommand from "./commands/rankend.js";
import { fetchMapRotation, MapRotation } from "./services/mapRotation.js";

// 起動時の環境変数バリデーション
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
  console.error("Error: DISCORD_TOKEN environment variable is not set.");
  process.exit(1);
}

const commands = [rankCommand, rankstartCommand, rankendCommand];

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Cache for map rotation data
let cachedRotation: MapRotation | null = null;
let lastFetchTime: Date | null = null;

// リトライ設定
const MAX_RETRY_COUNT = 5;
const RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5分
let retryCount = 0;

// タイマー管理（Graceful Shutdown用）
let statusUpdateTimer: NodeJS.Timeout | null = null;
let isShuttingDown = false;

function formatRemainingTime(mins: number): string {
  if (mins <= 0) return "まもなく";
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  }
  return `${minutes}分`;
}

function updateStatusDisplay() {
  if (isShuttingDown || !cachedRotation || !lastFetchTime) return;

  // Calculate elapsed minutes since last fetch
  const elapsedMs = Date.now() - lastFetchTime.getTime();
  const elapsedMins = Math.floor(elapsedMs / (60 * 1000));
  const currentRemainingMins = Math.max(0, cachedRotation.current.remainingMins - elapsedMins);

  const status = `${cachedRotation.current.name} (残り${formatRemainingTime(currentRemainingMins)})`;
  client.user?.setActivity(status, { type: ActivityType.Playing });

  // If map should have changed, fetch new data
  if (currentRemainingMins <= 0) {
    console.log("Map rotation ended, fetching new data...");
    fetchAndUpdateRotation();
  } else {
    // Schedule next display update in 1 minute
    statusUpdateTimer = setTimeout(updateStatusDisplay, 60 * 1000);
  }
}

async function fetchAndUpdateRotation() {
  if (isShuttingDown) return;

  try {
    cachedRotation = await fetchMapRotation();
    lastFetchTime = new Date();
    retryCount = 0; // 成功したらリトライカウントをリセット

    const status = `${cachedRotation.current.name} (残り${formatRemainingTime(cachedRotation.current.remainingMins)})`;
    client.user?.setActivity(status, { type: ActivityType.Playing });
    console.log(`Status updated from API: ${status}`);

    // Schedule next display update in 1 minute
    statusUpdateTimer = setTimeout(updateStatusDisplay, 60 * 1000);
  } catch (error) {
    retryCount++;
    console.error(`Failed to fetch map rotation (attempt ${retryCount}/${MAX_RETRY_COUNT}):`, error);

    if (retryCount < MAX_RETRY_COUNT) {
      // リトライ上限に達していない場合は再試行
      statusUpdateTimer = setTimeout(fetchAndUpdateRotation, RETRY_INTERVAL_MS);
    } else {
      // リトライ上限に達した場合はステータスを更新して停止
      console.error("Max retry count reached. Map rotation updates disabled.");
      client.user?.setActivity("マップ情報取得エラー", { type: ActivityType.Playing });
    }
  }
}

client.once("clientReady", async () => {
  const botUser = client.user;
  if (!botUser) {
    console.error("Error: client.user is not available after ready event.");
    return;
  }

  console.log(`Logged in as ${botUser.tag}`);

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

  try {
    console.log("Registering slash commands...");

    // Clear global commands to avoid duplicates
    await rest.put(Routes.applicationCommands(botUser.id), {
      body: [],
    });
    console.log("Global commands cleared");

    // Register as guild commands for immediate availability
    const guilds = client.guilds.cache;
    for (const [guildId, guild] of guilds) {
      await rest.put(Routes.applicationGuildCommands(botUser.id, guildId), {
        body: commands.map((cmd) => cmd.data.toJSON()),
      });
      console.log(`Commands registered for guild: ${guild.name}`);
    }

    console.log("Slash commands registered!");
  } catch (error) {
    console.error("Failed to register commands:", error);
  }

  // Fetch map rotation and start 1-minute update cycle
  await fetchAndUpdateRotation();
});

// Register commands when bot joins a new guild
client.on("guildCreate", async (guild) => {
  console.log(`Joined new guild: ${guild.name}`);

  const botUser = client.user;
  if (!botUser) return;

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

  try {
    await rest.put(Routes.applicationGuildCommands(botUser.id, guild.id), {
      body: commands.map((cmd) => cmd.data.toJSON()),
    });
    console.log(`Commands registered for new guild: ${guild.name}`);
  } catch (error) {
    console.error(`Failed to register commands for guild ${guild.name}:`, error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.find((cmd) => cmd.data.name === interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const reply = {
      content: "コマンドの実行中にエラーが発生しました",
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Graceful Shutdown
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${signal} received. Shutting down gracefully...`);

  // タイマーをクリア
  if (statusUpdateTimer) {
    clearTimeout(statusUpdateTimer);
    statusUpdateTimer = null;
    console.log("Timers cleared.");
  }

  // Discord clientを破棄
  try {
    client.destroy();
    console.log("Discord client destroyed.");
  } catch (error) {
    console.error("Error destroying Discord client:", error);
  }

  console.log("Shutdown complete.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

client.login(DISCORD_TOKEN);
