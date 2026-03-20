import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is not set.");
    }
    sql = postgres(databaseUrl);
    db = drizzle(sql, { schema });
  }
  return db;
}

export async function closeDb() {
  if (sql) {
    await sql.end();
    sql = null;
    db = null;
    console.log("Database connection closed.");
  }
}
