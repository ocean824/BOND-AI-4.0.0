import { db } from "./db";
import { users, judgments, bundles, bundleJudgments } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // Check if admin user already exists
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

  // Create sample judgments
  const existingJudgments = await db
    .select()
    .from(judgments)
    .where(eq(judgments.ownerId, adminUser.id));

  if (existingJudgments.length === 0) {
    console.log("Creating sample judgments...");

    const sampleJudgments = [
      {
        ownerId: adminUser.id,
        debtorName: "Acme Corporation",
        caseNumber: "CV-2024-001234",
        court: "Superior Court of California",
        jurisdiction: "Los Angeles County",
        judgmentAmount: "125000.00",
        judgmentDate: new Date("2024-01-15"),
        status: "extracted",
        notes: "Commercial debt case",
      },
      {
        ownerId: adminUser.id,
        debtorName: "Smith Enterprises LLC",
        caseNumber: "CV-2024-005678",
        court: "District Court of New York",
        jurisdiction: "Manhattan",
        judgmentAmount: "89500.00",
        judgmentDate: new Date("2024-02-20"),
        status: "extracted",
        notes: "Contract dispute settlement",
      },
      {
        ownerId: adminUser.id,
        debtorName: "Johnson & Associates",
        caseNumber: "CV-2024-009012",
        court: "Circuit Court of Illinois",
        jurisdiction: "Cook County",
        judgmentAmount: "67250.00",
        judgmentDate: new Date("2024-03-10"),
        status: "extracted",
        notes: "Breach of contract",
      },
    ];

    const createdJudgments = await db
      .insert(judgments)
      .values(sampleJudgments)
      .returning();

    console.log(`✅ Created ${createdJudgments.length} sample judgments`);

    // Create a sample bundle
    console.log("Creating sample bundle...");

    const [sampleBundle] = await db
      .insert(bundles)
      .values({
        ownerId: adminUser.id,
        name: "Q1 2025 Portfolio",
        description: "First quarter investment bundle with diversified risk tranches",
        status: "open",
      })
      .returning();

    console.log("✅ Created sample bundle:", sampleBundle.name);

    // Add judgments to bundle with different tranches
    await db.insert(bundleJudgments).values([
      {
        bundleId: sampleBundle.id,
        judgmentId: createdJudgments[0].id,
        tranche: "senior",
      },
      {
        bundleId: sampleBundle.id,
        judgmentId: createdJudgments[1].id,
        tranche: "mezz",
      },
      {
        bundleId: sampleBundle.id,
        judgmentId: createdJudgments[2].id,
        tranche: "equity",
      },
    ]);

    console.log("✅ Added judgments to bundle with tranche allocations");
  } else {
    console.log("✅ Sample data already exists");
  }

  console.log("\n🎉 Seeding complete!");
  console.log("\n📧 Login credentials:");
  console.log("   Email: admin@bondai.app");
  console.log("   Password: admin123");
}

seed()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
