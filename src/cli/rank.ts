import "dotenv/config";
import { fetchPlayerStats } from "../services/apexApi.js";
import {
  calculateRankProgress,
  formatRankProgress,
} from "../utils/rankCalculator.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: npm run rank -- <PlayerName> [Platform]");
    console.error("Platform: PC, PS4, X1, SWITCH (default: PC)");
    process.exit(1);
  }

  const playerName = args[0];
  const platform = args[1] || "PC";

  try {
    console.log(`Fetching stats for ${playerName} (${platform})...`);
    const stats = await fetchPlayerStats(playerName, platform);
    const progress = calculateRankProgress(stats.currentRP, stats.rankName, stats.rankDiv);
    console.log("");
    console.log(formatRankProgress(stats.name, progress).replace(/\*\*/g, ""));
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("Unknown error occurred");
    }
    process.exit(1);
  }
}

main();
