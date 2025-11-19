#!/usr/bin/env tsx
import { db } from "../server/db";
import { users } from "../shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

/**
 * Emergency script to manually create admin and test users
 * Run this if deployment script failed to create users
 */
async function createUsers() {
  console.log("🔧 Creating users...\n");

  try {
    // Create admin user
    console.log("1️⃣ Creating admin user...");
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@bondai.app"));

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      
      const [adminUser] = await db
        .insert(users)
        .values({
          email: "admin@bondai.app",
          password: hashedPassword,
          name: "Admin User",
          role: "admin",
        })
        .returning();

      console.log("   ✅ Admin user created:", adminUser.email);
    } else {
      console.log("   ✅ Admin user already exists:", existingAdmin.email);
    }

    // Create test user
    console.log("\n2️⃣ Creating test user...");
    const [existingTestUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "test@bondai.app"));

    if (!existingTestUser) {
      const hashedPassword = await bcrypt.hash("Test2024!", 10);
      
      const [testUser] = await db
        .insert(users)
        .values({
          email: "test@bondai.app",
          password: hashedPassword,
          name: "Test User",
          role: "analyst",
        })
        .returning();

      console.log("   ✅ Test user created:", testUser.email);
    } else {
      console.log("   ✅ Test user already exists:", existingTestUser.email);
    }

    console.log("\n🎉 User creation complete!");
    console.log("\nCredentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test User:");
    console.log("  Email: test@bondai.app");
    console.log("  Password: Test2024!");
    console.log("\nAdmin User:");
    console.log("  Email: admin@bondai.app");
    console.log("  Password: admin123");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ User creation failed:", error);
    process.exit(1);
  }
}

createUsers();
