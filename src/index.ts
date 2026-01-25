import "dotenv/config";
import { Client, GatewayIntentBits, REST, Routes, ActivityType } from "discord.js";
import * as rankCommand from "./commands/rank.js";
import { fetchMapRotation, formatMapStatus } from "./services/mapRotation.js";

const commands = [rankCommand];

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

async function updateBotStatus() {
  try {
    const rotation = await fetchMapRotation();
    const status = formatMapStatus(rotation);
    client.user?.setActivity(status, { type: ActivityType.Playing });
    console.log(`Status updated: ${status}`);
  } catch (error) {
    console.error("Failed to update status:", error);
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

  // Update status immediately and every 30 minutes
  await updateBotStatus();
  setInterval(updateBotStatus, 30 * 60 * 1000);
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
