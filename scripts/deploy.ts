#!/usr/bin/env tsx
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { db } from "../server/db";
import { sql, eq } from "drizzle-orm";
import { users } from "../shared/schema";
import bcrypt from "bcryptjs";

/**
 * Pre-deployment script that runs migrations and validates database state
 * This should be run before deploying to production
 */
async function deploy() {
  console.log("🚀 Starting deployment process...\n");

  // Step 1: Check database connection
  console.log("1️⃣ Checking database connection...");
  try {
    await db.execute(sql`SELECT 1`);
    console.log("✅ Database connection successful\n");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }

  // Step 2: Run pending migrations
  console.log("2️⃣ Running pending migrations...");
  try {
    await migrate(db, { migrationsFolder: "./migrations" });
    console.log("✅ Migrations completed successfully\n");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    console.error("   Deployment aborted to prevent data loss");
    process.exit(1);
  }

  // Step 3: Validate critical tables exist
  console.log("3️⃣ Validating database schema...");
  const criticalTables = [
    'users',
    'judgments',
    'bundles',
    'bonds',
    'bond_documents',
    'price_estimates'
  ];

  try {
    for (const table of criticalTables) {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${table}
      `);
      
      if (!result.rows[0] || result.rows[0].count === '0') {
        throw new Error(`Critical table '${table}' not found`);
      }
    }
    console.log("✅ All critical tables validated\n");
  } catch (error) {
    console.error("❌ Schema validation failed:", error);
    process.exit(1);
  }

  // Step 4: Verify real data policy (no mock data in production)
  console.log("4️⃣ Verifying real data policy...");
  if (process.env.NODE_ENV === 'production') {
    console.log("⚠️  Production environment detected - enforcing real data policy");
    
    // Check for known placeholder patterns in critical tables
    const mockPatterns = [
      { table: 'judgments', column: 'debtor_name', patterns: ['test', 'mock', 'sample', 'placeholder', 'demo', 'example'] },
      { table: 'judgments', column: 'case_number', patterns: ['TEST-', 'MOCK-', 'SAMPLE-', 'DEMO-', 'EXAMPLE-'] },
      { table: 'bonds', column: 'name', patterns: ['test', 'mock', 'sample', 'placeholder', 'demo', 'example'] },
      { table: 'bonds', column: 'cusip', patterns: ['TEST', 'MOCK', 'SAMPLE', 'DEMO', 'EXAMPLE', '000000000'] },
    ];

    let violationsFound = false;

    for (const check of mockPatterns) {
      for (const pattern of check.patterns) {
        const likePattern = `%${pattern.toLowerCase()}%`;
        const result = await db.execute(sql`
          SELECT COUNT(*) as count 
          FROM ${sql.raw(check.table)}
          WHERE LOWER(${sql.raw(check.column)}::text) LIKE ${likePattern}
        `);
        
        const count = parseInt(String(result.rows[0]?.count || '0'));
        
        if (count > 0) {
          console.error(`   ❌ Found ${count} records in ${check.table}.${check.column} matching mock pattern: "${pattern}"`);
          violationsFound = true;
        }
      }
    }

    // Check for suspiciously uniform data (all same judgment amount, etc.)
    const uniformityChecks = [
      { table: 'judgments', column: 'judgment_amount', threshold: 10 },
      { table: 'bonds', column: 'face_value', threshold: 5 },
    ];

    for (const check of uniformityChecks) {
      const result = await db.execute(sql`
        SELECT ${sql.raw(check.column)}, COUNT(*) as count 
        FROM ${sql.raw(check.table)}
        WHERE ${sql.raw(check.column)} IS NOT NULL
        GROUP BY ${sql.raw(check.column)}
        HAVING COUNT(*) >= ${check.threshold}
      `);
      
      if (result.rows.length > 0) {
        for (const row of result.rows) {
          console.error(`   ⚠️  Warning: ${row.count} records in ${check.table} have identical ${check.column}: ${row[check.column]}`);
          console.error(`      This may indicate mock data (${check.threshold}+ identical values is suspicious)`);
        }
      }
    }

    if (violationsFound) {
      console.error("\n❌ DEPLOYMENT BLOCKED: Mock/placeholder data detected in production database");
      console.error("   The 'real data only' policy requires all judgment and bond data to be authentic");
      console.error("   Remove all test/mock/sample data before deploying to production\n");
      process.exit(1);
    }
    
    console.log("✅ Real data policy compliance verified - no mock data detected\n");
  } else {
    console.log("ℹ️  Development environment - real data policy noted (not enforced)\n");
  }

  // Step 5: Ensure admin user exists
  console.log("5️⃣ Ensuring admin user exists...");
  try {
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@bondai.app"));

    if (!existingAdmin) {
      console.log("   Creating admin user...");
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
  } catch (error) {
    console.error("❌ Admin user creation failed:", error);
    process.exit(1);
  }

  // Step 6: Ensure test user exists
  console.log("6️⃣ Ensuring test user exists...");
  try {
    const [existingTestUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "test@bondai.app"));

    if (!existingTestUser) {
      console.log("   Creating test user...");
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
  } catch (error) {
    console.error("❌ Test user creation failed:", error);
    process.exit(1);
  }

  console.log("\n🎉 Deployment preparation complete!");
  console.log("   Database schema is up-to-date and validated");
  console.log("   Admin user is configured");
  console.log("   Test user is configured");
  console.log("   Safe to proceed with application deployment\n");
  
  process.exit(0);
}

deploy();
