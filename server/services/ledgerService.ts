import crypto from "crypto";
import { db } from "../db";
import { ledgerAccounts, ledgerJournalEntries, ledgerPostings } from "@shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

// Chart of accounts codes
export const ACCOUNT_CODES = {
  // Asset accounts
  CASH_STRIPE: "1200", // Cash/Stripe clearing account
  CASH_HOLDING: "1210", // Cash holding account for distributions
  ACCOUNTS_RECEIVABLE: "1300", // Amounts owed to us
  
  // Liability accounts
  INVESTOR_PAYABLE: "2100", // Amounts owed to investors
  ISSUER_PAYABLE: "2200", // Amounts owed to bond issuers
  PLATFORM_FEES: "2300", // Platform fee payable
  
  // Equity/Reserve accounts
  RECOUPMENT_RESERVE: "3100", // Recoupment reserve for surety
  DISTRIBUTABLE_EARNINGS: "3200", // Earnings available for distribution
  RETAINED_EARNINGS: "3300", // Retained earnings
  
  // Revenue accounts
  BOND_SALES_REVENUE: "4100", // Revenue from bond sales
  INTEREST_INCOME: "4200", // Interest income from bonds
  PLATFORM_FEES_REVENUE: "4300", // Platform fee revenue
  
  // Expense accounts
  PLATFORM_FEES_EXPENSE: "5100", // Platform operating expenses
  SURETY_CLAIMS: "5200", // Surety claims paid out
  DISTRIBUTION_EXPENSE: "5300", // Distribution processing costs
};

// Account names and types for display
export const ACCOUNT_DEFINITIONS: Record<string, { name: string; type: string; normalBalance: string }> = {
  "1200": { name: "Cash - Stripe Clearing", type: "ASSET", normalBalance: "DEBIT" },
  "1210": { name: "Cash - Holding Account", type: "ASSET", normalBalance: "DEBIT" },
  "1300": { name: "Accounts Receivable", type: "ASSET", normalBalance: "DEBIT" },
  "2100": { name: "Investor Payable", type: "LIABILITY", normalBalance: "CREDIT" },
  "2200": { name: "Issuer Payable", type: "LIABILITY", normalBalance: "CREDIT" },
  "2300": { name: "Platform Fees Payable", type: "LIABILITY", normalBalance: "CREDIT" },
  "3100": { name: "Recoupment Reserve", type: "EQUITY", normalBalance: "CREDIT" },
  "3200": { name: "Distributable Earnings", type: "EQUITY", normalBalance: "CREDIT" },
  "3300": { name: "Retained Earnings", type: "EQUITY", normalBalance: "CREDIT" },
  "4100": { name: "Bond Sales Revenue", type: "REVENUE", normalBalance: "CREDIT" },
  "4200": { name: "Interest Income", type: "REVENUE", normalBalance: "CREDIT" },
  "4300": { name: "Platform Fees Revenue", type: "REVENUE", normalBalance: "CREDIT" },
  "5100": { name: "Platform Expenses", type: "EXPENSE", normalBalance: "DEBIT" },
  "5200": { name: "Surety Claims", type: "EXPENSE", normalBalance: "DEBIT" },
  "5300": { name: "Distribution Expense", type: "EXPENSE", normalBalance: "DEBIT" },
};

export interface JournalEntryLine {
  accountCode: string;
  debit: number;
  credit: number;
  description: string;
}

export interface JournalEntryData {
  type: string;
  description: string;
  currency: string;
  lines: JournalEntryLine[];
  metadata?: Record<string, unknown>;
}

export interface JournalRecord extends JournalEntryData {
  id: number;
  journalHash: string;
  previousHash: string;
  timestamp: Date;
  isBalanced: boolean;
}

export interface AccountBalance {
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

/**
 * Initializes the chart of accounts in the database
 * Creates all standard accounts if they don't exist
 */
export async function initializeChartOfAccounts(): Promise<void> {
  for (const [code, def] of Object.entries(ACCOUNT_DEFINITIONS)) {
    const [existing] = await db
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.accountCode, code));

    if (!existing) {
      await db.insert(ledgerAccounts).values({
        accountCode: code,
        accountName: def.name,
        accountType: def.type,
        normalBalance: def.normalBalance,
        description: `Standard ${def.type.toLowerCase()} account`,
        isActive: true,
      });
      console.log(`[Ledger] Created account ${code} - ${def.name}`);
    }
  }
}

/**
 * Gets the last journal hash from the database for chain continuity
 */
async function getLastJournalHash(): Promise<string> {
  const [lastJournal] = await db
    .select({ journalHash: ledgerJournalEntries.journalHash })
    .from(ledgerJournalEntries)
    .orderBy(desc(ledgerJournalEntries.id))
    .limit(1);

  return lastJournal?.journalHash || "GENESIS";
}

/**
 * Posts a journal entry to the ledger with hash chaining
 * Now uses database persistence with proper double-entry accounting
 */
export async function postJournalEntry(data: JournalEntryData): Promise<number> {
  // Validate that debits equal credits
  const totalDebits = data.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredits = data.lines.reduce((sum, line) => sum + line.credit, 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(
      `Unbalanced journal entry: debits (${totalDebits.toFixed(2)}) != credits (${totalCredits.toFixed(2)})`
    );
  }

  // Verify all accounts exist
  for (const line of data.lines) {
    const [account] = await db
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.accountCode, line.accountCode));

    if (!account) {
      throw new Error(`Account ${line.accountCode} does not exist in chart of accounts`);
    }

    if (!account.isActive) {
      throw new Error(`Account ${line.accountCode} is inactive`);
    }
  }

  // Get previous hash for chain
  const previousHash = await getLastJournalHash();

  // Create journal record with hash chain
  const timestamp = new Date();
  const journalContent = JSON.stringify({
    type: data.type,
    description: data.description,
    lines: data.lines,
    timestamp: timestamp.toISOString(),
    previousHash,
  });

  const journalHash = crypto
    .createHash("sha256")
    .update(journalContent)
    .digest("hex");

  // Insert journal entry
  const [journal] = await db
    .insert(ledgerJournalEntries)
    .values({
      journalType: data.type,
      description: data.description,
      currency: data.currency,
      journalHash,
      previousHash,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      metadata: data.metadata || {},
    })
    .returning();

  // Create postings for each line
  for (const line of data.lines) {
    await db.insert(ledgerPostings).values({
      journalEntryId: journal.id,
      accountCode: line.accountCode,
      debit: line.debit.toFixed(2),
      credit: line.credit.toFixed(2),
      description: line.description,
    });
  }

  console.log(`[Ledger] Journal #${journal.id} posted - ${data.type} - ${journalHash.substring(0, 16)}...`);

  return journal.id;
}

/**
 * Retrieves a journal entry by ID
 */
export async function getJournalById(journalId: number): Promise<JournalRecord | null> {
  const [journal] = await db
    .select()
    .from(ledgerJournalEntries)
    .where(eq(ledgerJournalEntries.id, journalId));

  if (!journal) return null;

  const postingsData = await db
    .select()
    .from(ledgerPostings)
    .where(eq(ledgerPostings.journalEntryId, journalId));

  return {
    id: journal.id,
    type: journal.journalType,
    description: journal.description,
    currency: journal.currency,
    lines: postingsData.map((p) => ({
      accountCode: p.accountCode,
      debit: parseFloat(p.debit),
      credit: parseFloat(p.credit),
      description: p.description || "",
    })),
    metadata: journal.metadata as Record<string, unknown> || {},
    journalHash: journal.journalHash,
    previousHash: journal.previousHash,
    timestamp: journal.createdAt,
    isBalanced: journal.isBalanced,
  };
}

/**
 * Retrieves journal entries with optional filters
 */
export async function getJournalEntries(
  filters?: { type?: string; startDate?: Date; endDate?: Date; limit?: number }
): Promise<JournalRecord[]> {
  let query = db.select().from(ledgerJournalEntries);

  const conditions = [];
  
  if (filters?.type) {
    conditions.push(eq(ledgerJournalEntries.journalType, filters.type));
  }

  if (filters?.startDate) {
    conditions.push(gte(ledgerJournalEntries.createdAt, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(ledgerJournalEntries.createdAt, filters.endDate));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const journals = await query.orderBy(desc(ledgerJournalEntries.createdAt)).limit(filters?.limit || 100);

  // Fetch postings for each journal
  const result: JournalRecord[] = [];
  for (const journal of journals) {
    const postingsData = await db
      .select()
      .from(ledgerPostings)
      .where(eq(ledgerPostings.journalEntryId, journal.id));

    result.push({
      id: journal.id,
      type: journal.journalType,
      description: journal.description,
      currency: journal.currency,
      lines: postingsData.map((p) => ({
        accountCode: p.accountCode,
        debit: parseFloat(p.debit),
        credit: parseFloat(p.credit),
        description: p.description || "",
      })),
      metadata: journal.metadata as Record<string, unknown> || {},
      journalHash: journal.journalHash,
      previousHash: journal.previousHash,
      timestamp: journal.createdAt,
      isBalanced: journal.isBalanced,
    });
  }

  return result;
}

/**
 * Calculates the current balance for a specific account
 */
export async function getAccountBalance(accountCode: string): Promise<number> {
  const result = await db
    .select({
      totalDebit: sql<string>`COALESCE(SUM(CAST(${ledgerPostings.debit} AS DECIMAL)), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(CAST(${ledgerPostings.credit} AS DECIMAL)), 0)`,
    })
    .from(ledgerPostings)
    .where(eq(ledgerPostings.accountCode, accountCode));

  if (!result[0]) return 0;

  const debit = parseFloat(result[0].totalDebit);
  const credit = parseFloat(result[0].totalCredit);

  return debit - credit;
}

/**
 * Generates a trial balance report showing all account balances
 */
export async function getTrialBalance(): Promise<AccountBalance[]> {
  const accounts = await db
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.isActive, true))
    .orderBy(ledgerAccounts.accountCode);

  const result: AccountBalance[] = [];

  for (const account of accounts) {
    const postingsData = await db
      .select({
        totalDebit: sql<string>`COALESCE(SUM(CAST(${ledgerPostings.debit} AS DECIMAL)), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(CAST(${ledgerPostings.credit} AS DECIMAL)), 0)`,
      })
      .from(ledgerPostings)
      .where(eq(ledgerPostings.accountCode, account.accountCode));

    const debitTotal = postingsData[0] ? parseFloat(postingsData[0].totalDebit) : 0;
    const creditTotal = postingsData[0] ? parseFloat(postingsData[0].totalCredit) : 0;
    const balance = debitTotal - creditTotal;

    result.push({
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      normalBalance: account.normalBalance,
      debitTotal,
      creditTotal,
      balance,
    });
  }

  return result;
}

/**
 * Gets all postings for a specific account
 */
export async function getAccountPostings(
  accountCode: string,
  options?: { startDate?: Date; endDate?: Date; limit?: number }
): Promise<Array<{
  id: number;
  journalEntryId: number;
  debit: number;
  credit: number;
  description: string;
  timestamp: Date;
  runningBalance: number;
}>> {
  let query = db
    .select({
      posting: ledgerPostings,
      journal: ledgerJournalEntries,
    })
    .from(ledgerPostings)
    .innerJoin(ledgerJournalEntries, eq(ledgerPostings.journalEntryId, ledgerJournalEntries.id))
    .where(eq(ledgerPostings.accountCode, accountCode));

  const conditions = [eq(ledgerPostings.accountCode, accountCode)];

  if (options?.startDate) {
    conditions.push(gte(ledgerJournalEntries.createdAt, options.startDate));
  }

  if (options?.endDate) {
    conditions.push(lte(ledgerJournalEntries.createdAt, options.endDate));
  }

  const results = await db
    .select({
      posting: ledgerPostings,
      journal: ledgerJournalEntries,
    })
    .from(ledgerPostings)
    .innerJoin(ledgerJournalEntries, eq(ledgerPostings.journalEntryId, ledgerJournalEntries.id))
    .where(and(...conditions))
    .orderBy(ledgerJournalEntries.createdAt)
    .limit(options?.limit || 1000);

  let runningBalance = 0;
  return results.map(({ posting, journal }) => {
    const debit = parseFloat(posting.debit);
    const credit = parseFloat(posting.credit);
    runningBalance += debit - credit;

    return {
      id: posting.id,
      journalEntryId: posting.journalEntryId,
      debit,
      credit,
      description: posting.description || "",
      timestamp: journal.createdAt,
      runningBalance,
    };
  });
}

/**
 * Verifies the integrity of the entire ledger
 */
export async function verifyLedgerIntegrity(): Promise<{
  valid: boolean;
  issues: string[];
  totalJournals: number;
  totalPostings: number;
}> {
  const issues: string[] = [];

  // Get all journals
  const journals = await db
    .select()
    .from(ledgerJournalEntries)
    .orderBy(ledgerJournalEntries.id);

  // Check each journal is balanced
  for (const journal of journals) {
    const postingsData = await db
      .select()
      .from(ledgerPostings)
      .where(eq(ledgerPostings.journalEntryId, journal.id));

    const totalDebits = postingsData.reduce((sum, p) => sum + parseFloat(p.debit), 0);
    const totalCredits = postingsData.reduce((sum, p) => sum + parseFloat(p.credit), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      issues.push(`Journal #${journal.id} is unbalanced: debits=${totalDebits.toFixed(2)}, credits=${totalCredits.toFixed(2)}`);
    }
  }

  // Verify hash chain
  for (let i = 1; i < journals.length; i++) {
    const current = journals[i];
    const previous = journals[i - 1];

    if (current.previousHash !== previous.journalHash) {
      issues.push(`Journal #${current.id} hash chain is broken: previousHash doesn't match`);
    }
  }

  // Count total postings
  const postingsCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ledgerPostings);

  return {
    valid: issues.length === 0,
    issues,
    totalJournals: journals.length,
    totalPostings: postingsCount[0]?.count || 0,
  };
}

/**
 * Gets financial summary by account type
 */
export async function getFinancialSummary(): Promise<{
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}> {
  const trialBalance = await getTrialBalance();

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const account of trialBalance) {
    const balance = account.balance;

    switch (account.accountType) {
      case "ASSET":
        totalAssets += balance;
        break;
      case "LIABILITY":
        totalLiabilities += Math.abs(balance);
        break;
      case "EQUITY":
        totalEquity += Math.abs(balance);
        break;
      case "REVENUE":
        totalRevenue += Math.abs(balance);
        break;
      case "EXPENSE":
        totalExpenses += balance;
        break;
    }
  }

  const netIncome = totalRevenue - totalExpenses;

  return {
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalRevenue,
    totalExpenses,
    netIncome,
  };
}

/**
 * Creates a new account in the chart of accounts
 */
export async function createAccount(
  accountCode: string,
  accountName: string,
  accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE",
  normalBalance: "DEBIT" | "CREDIT",
  description?: string
): Promise<void> {
  const [existing] = await db
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.accountCode, accountCode));

  if (existing) {
    throw new Error(`Account ${accountCode} already exists`);
  }

  await db.insert(ledgerAccounts).values({
    accountCode,
    accountName,
    accountType,
    normalBalance,
    description: description || "",
    isActive: true,
  });

  console.log(`[Ledger] Created account ${accountCode} - ${accountName}`);
}
