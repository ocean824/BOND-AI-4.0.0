import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const TEST_INVESTOR_EMAIL = "testinvestor@bondai.app";
const TEST_INVESTOR_PASSWORD = "TestInvestor123!";

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
