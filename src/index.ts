import "dotenv/config";
import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import * as rankCommand from "./commands/rank.js";

const commands = [rankCommand];

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

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
