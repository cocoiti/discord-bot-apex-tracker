import "dotenv/config";
import { Client, GatewayIntentBits, REST, Routes, ActivityType } from "discord.js";
import * as rankCommand from "./commands/rank.js";
import { fetchMapRotation, formatMapStatus } from "./services/mapRotation.js";

const commands = [rankCommand];

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

function scheduleNextUpdate(remainingMins: number) {
  // Update when map changes, or every 30 minutes if remaining time is long
  const nextUpdateMins = Math.min(remainingMins + 1, 30);
  const nextUpdateMs = nextUpdateMins * 60 * 1000;

  console.log(`Next status update in ${nextUpdateMins} minutes`);
  setTimeout(updateBotStatus, nextUpdateMs);
}

async function updateBotStatus() {
  try {
    const rotation = await fetchMapRotation();
    const status = formatMapStatus(rotation);
    client.user?.setActivity(status, { type: ActivityType.Playing });
    console.log(`Status updated: ${status}`);

    scheduleNextUpdate(rotation.current.remainingMins);
  } catch (error) {
    console.error("Failed to update status:", error);
    // Retry after 5 minutes on error
    setTimeout(updateBotStatus, 5 * 60 * 1000);
  }
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}`);

  const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_TOKEN!
  );

  try {
    console.log("Registering slash commands...");
    await rest.put(Routes.applicationCommands(client.user!.id), {
      body: commands.map((cmd) => cmd.data.toJSON()),
    });
    console.log("Slash commands registered!");
  } catch (error) {
    console.error("Failed to register commands:", error);
  }

  // Update status immediately, then schedule based on map remaining time
  await updateBotStatus();
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

client.login(process.env.DISCORD_TOKEN);
