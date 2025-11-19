#!/usr/bin/env tsx
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { db } from "../server/db";

async function runMigrations() {
  console.log("🔄 Running database migrations...");
  
  try {
    await migrate(db, { migrationsFolder: "./migrations" });
    console.log("✅ Migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
