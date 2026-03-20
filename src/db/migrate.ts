import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }

  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql);

  try {
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations complete.");
  } finally {
    await sql.end();
  }
}

// CLI から直接実行された場合
const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/db/migrate.ts") ||
  process.argv[1]?.endsWith("/db/migrate.js");

if (isDirectRun) {
  await import("dotenv/config");
  runMigrations().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
