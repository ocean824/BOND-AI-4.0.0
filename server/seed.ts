import { db } from "./db";
import { users } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // ===== ADMIN USER CREATION (REAL ACCOUNT ONLY) =====
  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@bondai.app"));

  let adminUser;
  
  if (!existingAdmin) {
    console.log("Creating admin user...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    [adminUser] = await db
      .insert(users)
      .values({
        email: "admin@bondai.app",
        password: hashedPassword,
        name: "Admin User",
        role: "admin",
      })
      .returning();

    console.log("✅ Admin user created:", adminUser.email);
  } else {
    adminUser = existingAdmin;
    console.log("✅ Admin user already exists:", adminUser.email);
  }

  // ===== NO MOCK JUDGMENT DATA =====
  // This application operates on REAL judgment data only.
  // 
  // Judgment records are created ONLY through:
  // 1. User PDF uploads with AI extraction (real court documents)
  // 2. Manual entry of verified judgment information
  // 
  // NEVER seed with fabricated judgment data in production or development.
  // 
  // For testing purposes ONLY, you may uncomment the section below and replace
  // ALL placeholder values with REAL judgment data from actual court documents.
  // This should ONLY be used for local development testing and MUST be commented
  // out before any deployment.
  
  /*
  // DEV-ONLY: Uncomment and replace with REAL judgment data for testing
  const [existingJudgment] = await db
    .select()
    .from(judgments)
    .where(eq(judgments.ownerId, adminUser.id))
    .limit(1);

  if (!existingJudgment) {
    console.log("⚠️  DEV ONLY: Creating test judgment from REAL court document");
    
    // WARNING: Replace ALL fields below with actual values from a real judgment document
    await db.insert(judgments).values({
      ownerId: adminUser.id,
      debtorName: "REPLACE_WITH_REAL_DEBTOR_NAME",
      caseNumber: "REPLACE_WITH_REAL_CASE_NUMBER",
      court: "REPLACE_WITH_REAL_COURT_NAME",
      jurisdiction: "REPLACE_WITH_REAL_JURISDICTION",
      judgmentAmount: "REPLACE_WITH_REAL_AMOUNT", // e.g. "125000.00"
      judgmentDate: new Date("REPLACE_WITH_REAL_DATE"), // e.g. "2024-01-15"
      status: "extracted",
      notes: "REPLACE_WITH_REAL_NOTES",
    });

    console.log("✅ Test judgment created - ENSURE THIS IS FROM REAL DATA");
  }
  */

  console.log("\n🎉 Seeding complete!");
  console.log("\n📧 Login credentials:");
  console.log("   Email: admin@bondai.app");
  console.log("   Password: admin123");
  console.log("\n⚠️  IMPORTANT: This application uses REAL judgment data only.");
  console.log("   Upload PDF court documents or manually enter verified information.");
  console.log("   No mock/placeholder data is permitted.");
}

seed()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
