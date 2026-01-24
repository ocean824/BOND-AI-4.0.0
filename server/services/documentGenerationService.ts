import { db } from "../db";
import { investorDocuments, exchangeTrades, bonds, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Document Generation Service
 * Generates settlement receipts and other investor documents
 */

const STORAGE_ROOT = process.env.STORAGE_ROOT || "./storage";
const INVESTOR_DOCS_DIR = path.join(STORAGE_ROOT, "investor_documents");

/**
 * Ensure storage directory exists
 */
async function ensureStorageDir(userId: number): Promise<string> {
  const userDir = path.join(INVESTOR_DOCS_DIR, userId.toString());
  await fs.mkdir(userDir, { recursive: true });
  return userDir;
}

/**
 * Generate settlement receipt PDF (mock implementation)
 * In production, use a PDF library like pdfkit or puppeteer
 */
async function generateSettlementReceiptPDF(trade: any, bond: any, user: any): Promise<Buffer> {
  const content = `
SETTLEMENT RECEIPT
==================

Trade ID: ${trade.id}
Date: ${new Date().toISOString()}

INVESTOR INFORMATION
--------------------
Name: ${user.name}
Email: ${user.email}

BOND INFORMATION
----------------
Bond Name: ${bond.name}
Face Value: $${trade.amount}
CUSIP: ${bond.cusip || "N/A"}
Maturity Date: ${bond.maturityDate || "N/A"}

PAYMENT INFORMATION
-------------------
Amount Paid: $${trade.amount}
Payment Method: ${trade.jaceSessionId ? "JACE" : "Stripe"}
Payment Status: ${trade.status}
Transaction Date: ${new Date().toISOString()}

SETTLEMENT STATUS
-----------------
Status: COMPLETED
Settlement Date: ${new Date().toISOString()}

This is an official settlement receipt for your bond purchase.
Please retain this document for your records.

---
BondAI Platform
https://bondai.com
`;

  return Buffer.from(content, "utf-8");
}

/**
 * Create investor document record and store file
 */
export async function createInvestorDocument(params: {
  userId: number;
  bondId?: number;
  tradeId?: number;
  documentType: string;
  fileName: string;
  fileContent: Buffer;
  mimeType?: string;
  description?: string;
}): Promise<number> {
  const { userId, bondId, tradeId, documentType, fileName, fileContent, mimeType, description } = params;

  // Ensure storage directory exists
  const userDir = await ensureStorageDir(userId);

  // Generate unique filename
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueFileName = `${timestamp}_${safeFileName}`;
  const filePath = path.join(userDir, uniqueFileName);

  // Write file to storage
  await fs.writeFile(filePath, fileContent);

  // Insert record into database
  const [result] = await db
    .insert(investorDocuments)
    .values({
      userId,
      bondId: bondId || null,
      tradeId: tradeId || null,
      documentType,
      fileName: safeFileName,
      filePath,
      fileSize: fileContent.length,
      mimeType: mimeType || "application/pdf",
      description: description || null,
    })
    .returning({ id: investorDocuments.id });

  return result.id;
}

/**
 * Generate settlement receipt for a completed trade
 */
export async function generateSettlementReceipt(tradeId: number): Promise<number> {
  // Get trade details
  const [trade] = await db
    .select({
      id: exchangeTrades.id,
      investorId: exchangeTrades.investorId,
      bondId: exchangeTrades.bondId,
      amount: exchangeTrades.amount,
      status: exchangeTrades.status,
      jaceSessionId: exchangeTrades.jaceSessionId,
    })
    .from(exchangeTrades)
    .where(eq(exchangeTrades.id, tradeId))
    .limit(1);

  if (!trade) {
    throw new Error(`Trade ${tradeId} not found`);
  }

  // Get bond details
  const [bond] = await db
    .select({
      id: bonds.id,
      name: bonds.name,
      cusip: bonds.cusip,
      maturityDate: bonds.maturityDate,
    })
    .from(bonds)
    .where(eq(bonds.id, trade.bondId))
    .limit(1);

  if (!bond) {
    throw new Error(`Bond ${trade.bondId} not found`);
  }

  // Get user details
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, trade.investorId))
    .limit(1);

  if (!user) {
    throw new Error(`User ${trade.investorId} not found`);
  }

  // Generate PDF content
  const pdfBuffer = await generateSettlementReceiptPDF(trade, bond, user);

  // Create document record
  const documentId = await createInvestorDocument({
    userId: trade.investorId,
    bondId: trade.bondId,
    tradeId: trade.id,
    documentType: "settlement_receipt",
    fileName: `settlement_receipt_${trade.id}.pdf`,
    fileContent: pdfBuffer,
    mimeType: "application/pdf",
    description: `Settlement receipt for trade #${trade.id}`,
  });

  return documentId;
}

/**
 * Generate purchase confirmation document
 */
export async function generatePurchaseConfirmation(tradeId: number): Promise<number> {
  // Similar to settlement receipt but for initial purchase confirmation
  // Implementation similar to generateSettlementReceipt
  return generateSettlementReceipt(tradeId); // Reuse for now
}

/**
 * Get investor document by ID with access check
 */
export async function getInvestorDocument(documentId: number, userId: number, isAdmin: boolean = false) {
  const [doc] = await db
    .select()
    .from(investorDocuments)
    .where(eq(investorDocuments.id, documentId))
    .limit(1);

  if (!doc) {
    return null;
  }

  // Check access: owner or admin
  if (!isAdmin && doc.userId !== userId) {
    return null;
  }

  return doc;
}

/**
 * Read document file content
 */
export async function readDocumentFile(filePath: string): Promise<Buffer> {
  return await fs.readFile(filePath);
}
