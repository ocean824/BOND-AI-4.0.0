import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const TEST_INVESTOR_EMAIL = "testinvestor@bondai.app";
const TEST_INVESTOR_PASSWORD = "TestInvestor123!";
const ADMIN_EMAIL = "admin@bondai.app";

export async function seedTestInvestor(): Promise<void> {
  try {
    console.log("Checking test investor account...");
    
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, TEST_INVESTOR_EMAIL));
    
    if (existingUser) {
      if (existingUser.subscriptionStatus !== "active" || existingUser.subscriptionTier !== "premium") {
        await db
          .update(users)
          .set({
            subscriptionStatus: "active",
            subscriptionTier: "premium",
            role: "investor"
          })
          .where(eq(users.email, TEST_INVESTOR_EMAIL));
        
        console.log(`Updated test investor (${TEST_INVESTOR_EMAIL}) to active premium subscription`);
      } else {
        console.log(`Test investor already has active premium subscription`);
      }
    } else {
      const hashedPassword = await bcrypt.hash(TEST_INVESTOR_PASSWORD, 10);
      
      await db.insert(users).values({
        email: TEST_INVESTOR_EMAIL,
        password: hashedPassword,
        name: "Test Investor",
        role: "investor",
        subscriptionStatus: "active",
        subscriptionTier: "premium"
      });
      
      console.log(`Created test investor account: ${TEST_INVESTOR_EMAIL}`);
    }
  } catch (error) {
    console.error("Error seeding test investor:", error);
  }
}

export async function seedAdminUser(): Promise<void> {
  try {
    console.log("Checking admin user account...");
    
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.warn("ADMIN_PASSWORD not set - skipping admin user seed");
      return;
    }
    
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, ADMIN_EMAIL));
    
    if (existingAdmin) {
      if (existingAdmin.role !== "admin") {
        await db
          .update(users)
          .set({ role: "admin" })
          .where(eq(users.email, ADMIN_EMAIL));
        
        console.log(`Updated admin user role to admin`);
      } else {
        console.log(`Admin user already exists with correct role`);
      }
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await db.insert(users).values({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        name: "System Administrator",
        role: "admin"
      });
      
      console.log(`Created admin user account: ${ADMIN_EMAIL}`);
    }
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }
}
