import { db } from "../db";
import { bonds, suretyCases, suretyTrusts, bundles, judgments, auctions, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export type BondProcessStep =
  | "JUDGMENT_TO_BOND"
  | "PERFECTION"
  | "SURETY_UNDERWRITING"
  | "SURETY_ACTIVATION"
  | "EXCHANGE_LISTING"
  | "EXCHANGE_SALE"
  | "TRUST_ALLOCATION";

export type DocType =
  | "BOND_TERM_SHEET"
  | "BOND_INSTRUMENT"
  | "PERFECTION_CERT"
  | "GIA"
  | "COLLATERAL_AGREEMENT"
  | "SURETY_TRUST_RESOLUTION"
  | "UNDERWRITING_REPORT"
  | "EXCHANGE_OFFERING_SHEET"
  | "INVESTOR_SUBSCRIPTION"
  | "TRADE_CONFIRMATION"
  | "TRUST_BOARD_MINUTES"
  | "TRUST_ALLOCATION_RESOLUTION";

export const ALLOWED_STEPS: BondProcessStep[] = [
  "JUDGMENT_TO_BOND",
  "PERFECTION",
  "SURETY_UNDERWRITING",
  "SURETY_ACTIVATION",
  "EXCHANGE_LISTING",
  "EXCHANGE_SALE",
  "TRUST_ALLOCATION",
];

export const STEP_DOC_MAP: Record<BondProcessStep, DocType[]> = {
  JUDGMENT_TO_BOND: ["BOND_TERM_SHEET", "BOND_INSTRUMENT"],
  PERFECTION: ["PERFECTION_CERT"],
  SURETY_UNDERWRITING: ["UNDERWRITING_REPORT"],
  SURETY_ACTIVATION: ["GIA", "COLLATERAL_AGREEMENT", "SURETY_TRUST_RESOLUTION"],
  EXCHANGE_LISTING: ["EXCHANGE_OFFERING_SHEET"],
  EXCHANGE_SALE: ["INVESTOR_SUBSCRIPTION", "TRADE_CONFIRMATION"],
  TRUST_ALLOCATION: ["TRUST_BOARD_MINUTES", "TRUST_ALLOCATION_RESOLUTION"],
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  BOND_TERM_SHEET: "Bond Term Sheet",
  BOND_INSTRUMENT: "Bond Instrument",
  PERFECTION_CERT: "Perfection Certificate",
  GIA: "General Indemnity Agreement",
  COLLATERAL_AGREEMENT: "Collateral Agreement",
  SURETY_TRUST_RESOLUTION: "Surety Trust Resolution",
  UNDERWRITING_REPORT: "Underwriting Report",
  EXCHANGE_OFFERING_SHEET: "Exchange Offering Sheet",
  INVESTOR_SUBSCRIPTION: "Investor Subscription Agreement",
  TRADE_CONFIRMATION: "Trade Confirmation",
  TRUST_BOARD_MINUTES: "Trust Board Minutes",
  TRUST_ALLOCATION_RESOLUTION: "Trust Allocation Resolution",
};

export interface GenerateDocsInput {
  bondId: number;
  step: BondProcessStep;
  suretyCaseId?: number;
  trustId?: number;
  auctionId?: number;
  investorId?: number;
}

export interface GeneratedDoc {
  id: string;
  docType: DocType;
  label: string;
  storagePath: string;
  generatedAt: Date;
}

const DOCS_DIR = path.join(process.cwd(), "generated_docs");

async function ensureDocsDirectory(): Promise<void> {
  try {
    await fs.promises.mkdir(DOCS_DIR, { recursive: true });
  } catch (e) {
  }
}

function formatCurrency(amount: number | string | null | undefined): string {
  if (!amount) return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(num);
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function getBondData(bondId: number) {
  const [bond] = await db.select().from(bonds).where(eq(bonds.id, bondId));
  if (!bond) throw new Error(`Bond ${bondId} not found`);
  return bond;
}

async function getSuretyCaseData(caseId: number) {
  const [suretyCase] = await db.select().from(suretyCases).where(eq(suretyCases.id, caseId));
  return suretyCase;
}

async function getSuretyTrustData(trustId: number) {
  const [trust] = await db.select().from(suretyTrusts).where(eq(suretyTrusts.id, trustId));
  return trust;
}

async function getAuctionData(auctionId: number) {
  const [auction] = await db.select().from(auctions).where(eq(auctions.id, auctionId));
  return auction;
}

async function getUserData(userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user;
}

function createPDFDocument(): PDFKit.PDFDocument {
  return new PDFDocument({
    size: "LETTER",
    margins: { top: 72, bottom: 72, left: 72, right: 72 },
  });
}

function addDocumentHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string): void {
  doc.fontSize(20).font("Helvetica-Bold").text(title, { align: "center" });
  if (subtitle) {
    doc.moveDown(0.5);
    doc.fontSize(12).font("Helvetica").text(subtitle, { align: "center" });
  }
  doc.moveDown(2);
  doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke();
  doc.moveDown(1);
}

function addSection(doc: PDFKit.PDFDocument, title: string, content: string): void {
  doc.fontSize(12).font("Helvetica-Bold").text(title);
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica").text(content);
  doc.moveDown(1);
}

function addLabelValue(doc: PDFKit.PDFDocument, label: string, value: string): void {
  doc.fontSize(10).font("Helvetica-Bold").text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(value);
}

function addSignatureLine(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(2);
  doc.moveTo(72, doc.y).lineTo(300, doc.y).stroke();
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica").text(title);
  doc.moveDown(0.3);
  doc.text("Date: ____________________");
}

async function generateBondTermSheet(bond: any, outputPath: string): Promise<void> {
  const doc = createPDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  addDocumentHeader(doc, "BOND TERM SHEET", `Bond ID: ${bond.id}`);

  addSection(doc, "1. BOND IDENTIFICATION", "");
  addLabelValue(doc, "Bond Name", bond.name || "N/A");
  addLabelValue(doc, "CUSIP", bond.cusip || "To be assigned");
  addLabelValue(doc, "ISIN", bond.isin || "To be assigned");
  addLabelValue(doc, "Ticker Symbol", bond.ticker || "To be assigned");
  doc.moveDown(1);

  addSection(doc, "2. FINANCIAL TERMS", "");
  addLabelValue(doc, "Face Value", formatCurrency(bond.faceValue));
  addLabelValue(doc, "Currency", bond.currency || "USD");
  addLabelValue(doc, "Coupon Rate", bond.couponRate ? `${bond.couponRate}%` : "N/A");
  addLabelValue(doc, "Coupon Type", bond.couponType || "Fixed");
  doc.moveDown(1);

  addSection(doc, "3. KEY DATES", "");
  addLabelValue(doc, "Issue Date", formatDate(bond.issueDate));
  addLabelValue(doc, "Maturity Date", formatDate(bond.maturityDate));
  doc.moveDown(1);

  addSection(doc, "4. LEGAL", "");
  addLabelValue(doc, "Jurisdiction", bond.jurisdiction || "N/A");
  addLabelValue(doc, "Governing Law", bond.governingLaw || "N/A");
  doc.moveDown(1);

  addSection(doc, "5. RISK ASSESSMENT", "");
  addLabelValue(doc, "Bond Score", bond.bondScore ? `${bond.bondScore}/100` : "Not rated");
  addLabelValue(doc, "Risk Tier", bond.riskTier || "Unrated");
  doc.moveDown(1);

  addSection(doc, "6. STATUS", "");
  addLabelValue(doc, "Current Status", bond.status);
  addLabelValue(doc, "Bond Type", bond.bondType || "JUDGMENT");
  addLabelValue(doc, "Created", formatDate(bond.createdAt));

  doc.moveDown(2);
  doc.fontSize(8).font("Helvetica-Oblique").text(
    "This term sheet is for informational purposes only and does not constitute an offer to sell or solicitation to buy. " +
    "All terms are subject to change without notice.",
    { align: "center" }
  );

  doc.end();
  await new Promise<void>((resolve) => writeStream.on("finish", resolve));
}

async function generateBondInstrument(bond: any, outputPath: string): Promise<void> {
  const doc = createPDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  addDocumentHeader(doc, "BOND INSTRUMENT", "Legal Document");

  doc.fontSize(10).font("Helvetica").text(
    `This Bond Instrument ("Instrument") is executed as of ${formatDate(new Date())} by and between ` +
    `the issuer identified herein and the holders of record.`
  );
  doc.moveDown(1);

  addSection(doc, "ARTICLE I - DEFINITIONS", "");
  doc.fontSize(10).font("Helvetica").text(
    `"Bond" refers to the security identified as ${bond.name} (ID: ${bond.id}).\n` +
    `"Face Value" means ${formatCurrency(bond.faceValue)}.\n` +
    `"Maturity Date" means ${formatDate(bond.maturityDate) || "as specified in the schedule"}.`
  );
  doc.moveDown(1);

  addSection(doc, "ARTICLE II - PRINCIPAL AND INTEREST", "");
  doc.fontSize(10).font("Helvetica").text(
    `The principal amount of this Bond is ${formatCurrency(bond.faceValue)}. ` +
    `Interest shall accrue at the rate of ${bond.couponRate || "0"}% per annum, payable ` +
    `${bond.couponType === "floating" ? "at floating rates" : "at fixed intervals"}.`
  );
  doc.moveDown(1);

  addSection(doc, "ARTICLE III - REDEMPTION", "");
  doc.fontSize(10).font("Helvetica").text(
    "This Bond shall be redeemed at par value on the Maturity Date. Early redemption may be " +
    "permitted subject to terms outlined in the applicable prospectus or offering memorandum."
  );
  doc.moveDown(1);

  addSection(doc, "ARTICLE IV - GOVERNING LAW", "");
  doc.fontSize(10).font("Helvetica").text(
    `This Instrument shall be governed by and construed in accordance with the laws of ` +
    `${bond.governingLaw || bond.jurisdiction || "the applicable jurisdiction"}.`
  );
  doc.moveDown(1);

  addSection(doc, "ARTICLE V - TRANSFER", "");
  doc.fontSize(10).font("Helvetica").text(
    "Transfer of this Bond shall be registered in the books maintained by the Transfer Agent. " +
    "No transfer shall be effective until properly recorded."
  );

  addSignatureLine(doc, "Authorized Signatory - Issuer");
  addSignatureLine(doc, "Trustee / Agent");

  doc.end();
  await new Promise<void>((resolve) => writeStream.on("finish", resolve));
}

async function generatePerfectionCert(bond: any, outputPath: string): Promise<void> {
  const doc = createPDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  addDocumentHeader(doc, "CERTIFICATE OF PERFECTION", `Bond: ${bond.name}`);

  doc.fontSize(10).font("Helvetica").text(
    "This Certificate of Perfection certifies that all necessary filings, recordings, and legal requirements " +
    "have been completed to perfect the security interest in the underlying judgment and establish the bond " +
    "as a valid, enforceable instrument."
  );
  doc.moveDown(1.5);

  addSection(doc, "BOND DETAILS", "");
  addLabelValue(doc, "Bond ID", String(bond.id));
  addLabelValue(doc, "Bond Name", bond.name);
  addLabelValue(doc, "Face Value", formatCurrency(bond.faceValue));
  addLabelValue(doc, "CUSIP", bond.cusip || "Pending assignment");
  doc.moveDown(1);

  addSection(doc, "PERFECTION STATUS", "");
  addLabelValue(doc, "Status", bond.isPerfected ? "PERFECTED" : "PENDING");
  addLabelValue(doc, "Perfection Date", formatDate(bond.perfectedAt) || "N/A");
  doc.moveDown(1);

  addSection(doc, "FILINGS COMPLETED", "");
  doc.fontSize(10).font("Helvetica").text(
    "[ ] UCC-1 Financing Statement filed\n" +
    "[ ] Abstract of Judgment recorded\n" +
    "[ ] Notice of Lien filed\n" +
    "[ ] Certificate of Good Standing obtained\n" +
    "[ ] Title search completed\n" +
    "[ ] Priority position verified"
  );
  doc.moveDown(1);

  addSection(doc, "CERTIFICATION", "");
  doc.fontSize(10).font("Helvetica").text(
    "The undersigned hereby certifies that to the best of their knowledge and belief, all steps necessary " +
    "to perfect the security interest in the underlying judgment have been completed in accordance with " +
    "applicable law and regulatory requirements."
  );

  addSignatureLine(doc, "Certifying Officer");
  addSignatureLine(doc, "Compliance Officer");

  doc.end();
  await new Promise<void>((resolve) => writeStream.on("finish", resolve));
}

async function generateUnderwritingReport(bond: any, suretyCase: any, trust: any, outputPath: string): Promise<void> {
  const doc = createPDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  addDocumentHeader(doc, "SURETY UNDERWRITING REPORT", `Case ID: ${suretyCase?.id || "N/A"}`);

  addSection(doc, "1. EXECUTIVE SUMMARY", "");
  doc.fontSize(10).font("Helvetica").text(
    `This report presents the underwriting analysis for a ${bond.bondType || "JUDGMENT"} bond ` +
    `with a penal sum of ${formatCurrency(suretyCase?.bondPenalSum || bond.faceValue)}.`
  );
  doc.moveDown(1);

  addSection(doc, "2. BOND INFORMATION", "");
  addLabelValue(doc, "Bond ID", String(bond.id));
  addLabelValue(doc, "Bond Name", bond.name);
  addLabelValue(doc, "Bond Type", bond.bondType || "JUDGMENT");
  addLabelValue(doc, "Penal Sum", formatCurrency(suretyCase?.bondPenalSum || bond.faceValue));
  doc.moveDown(1);

  addSection(doc, "3. SURETY TRUST INFORMATION", "");
  if (trust) {
    addLabelValue(doc, "Trust Name", trust.name);
    addLabelValue(doc, "Trust Type", trust.trustType);
    addLabelValue(doc, "Max Single Bond Limit", formatCurrency(trust.maxSingleBondLimit));
    addLabelValue(doc, "Aggregate Limit", formatCurrency(trust.aggregateBondLimit));
    addLabelValue(doc, "Current Exposure", formatCurrency(trust.currentExposure));
  } else {
    doc.fontSize(10).font("Helvetica").text("No surety trust assigned");
  }
  doc.moveDown(1);

  addSection(doc, "4. RISK ASSESSMENT", "");
  addLabelValue(doc, "Principal Risk Score", suretyCase?.principalRiskScore ? `${suretyCase.principalRiskScore}/100` : "N/A");
  addLabelValue(doc, "Case Status", suretyCase?.status || "N/A");
  doc.moveDown(1);

  addSection(doc, "5. COLLATERAL REQUIREMENTS", "");
  addLabelValue(doc, "Required Amount", formatCurrency(suretyCase?.collateralRequiredAmount || 0));
  addLabelValue(doc, "Allowed Types", suretyCase?.collateralTypeAllowed?.join(", ") || "CASH, ILOC");
  addLabelValue(doc, "Indemnity Required", suretyCase?.indemnityRequired || "YES");
  addLabelValue(doc, "Insurance Required", suretyCase?.insuranceRequired || "NO");
  doc.moveDown(1);

  addSection(doc, "6. RECOMMENDATION", "");
  const status = suretyCase?.status || "PENDING";
  let recommendation = "Pending analysis";
  if (status === "APPROVED") recommendation = "APPROVED - Proceed with bond issuance";
  else if (status === "DECLINED") recommendation = "DECLINED - Do not proceed";
  else if (status === "APPROVED_WITH_COLLATERAL") recommendation = "APPROVED WITH CONDITIONS - Collateral required";
  doc.fontSize(10).font("Helvetica-Bold").text(recommendation);

  addSignatureLine(doc, "Underwriting Officer");

  doc.end();
  await new Promise<void>((resolve) => writeStream.on("finish", resolve));
}

async function generateGIA(bond: any, suretyCase: any, trust: any, outputPath: string): Promise<void> {
  const doc = createPDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  addDocumentHeader(doc, "GENERAL INDEMNITY AGREEMENT", "Surety Bond Indemnification");

  doc.fontSize(10).font("Helvetica").text(
    "This General Indemnity Agreement (\"Agreement\") is entered into as of " +
    `${formatDate(new Date())} by and between the Indemnitor(s) identified below and ` +
    `${trust?.name || "the Surety Trust"} (\"Surety\").`
  );
  doc.moveDown(1);

  addSection(doc, "RECITALS", "");
  doc.fontSize(10).font("Helvetica").text(
    `WHEREAS, the Principal has requested that Surety issue a ${bond.bondType || "judgment"} bond ` +
    `in the penal sum of ${formatCurrency(suretyCase?.bondPenalSum || bond.faceValue)};\n\n` +
    "WHEREAS, Surety requires indemnification as a condition of issuing such bond;\n\n" +
    "NOW, THEREFORE, in consideration of the foregoing and the mutual covenants herein, the parties agree:"
  );
  doc.moveDown(1);

  addSection(doc, "1. INDEMNIFICATION", "");
  doc.fontSize(10).font("Helvetica").text(
    "Indemnitor(s) jointly and severally agree to indemnify, defend, and hold harmless the Surety from " +
    "and against any and all losses, costs, damages, attorneys' fees, and expenses incurred by Surety " +
    "arising from or related to the Bond."
  );
  doc.moveDown(1);

  addSection(doc, "2. COLLATERAL", "");
  doc.fontSize(10).font("Helvetica").text(
    `The Surety may require collateral in the amount of ${formatCurrency(suretyCase?.collateralRequiredAmount || 0)} ` +
    "as security for this Agreement. Acceptable forms include: " +
    `${suretyCase?.collateralTypeAllowed?.join(", ") || "Cash, Irrevocable Letter of Credit"}.`
  );
  doc.moveDown(1);

  addSection(doc, "3. PREMIUM", "");
  doc.fontSize(10).font("Helvetica").text(
    "Indemnitor(s) agree to pay all premiums, fees, and charges associated with the Bond as they become due."
  );
  doc.moveDown(1);

  addSection(doc, "4. ASSIGNMENT", "");
  doc.fontSize(10).font("Helvetica").text(
    "Indemnitor(s) hereby assign to Surety any rights they may have against the obligee or any third party " +
    "related to the underlying obligation."
  );

  addSignatureLine(doc, "Principal / Indemnitor");
  addSignatureLine(doc, "Surety Representative");

  doc.end();
  await new Promise<void>((resolve) => writeStream.on("finish", resolve));
}

async function generateCollateralAgreement(bond: any, suretyCase: any, outputPath: string): Promise<void> {
  const doc = createPDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  addDocumentHeader(doc, "COLLATERAL AGREEMENT", "Security for Surety Bond");

  doc.fontSize(10).font("Helvetica").text(
    `This Collateral Agreement is entered into as of ${formatDate(new Date())} in connection with ` +
    `the surety bond issued for ${bond.name}.`
  );
  doc.moveDown(1);

  addSection(doc, "1. COLLATERAL REQUIREMENT", "");
  addLabelValue(doc, "Required Amount", formatCurrency(suretyCase?.collateralRequiredAmount || 0));
  addLabelValue(doc, "Acceptable Types", suretyCase?.collateralTypeAllowed?.join(", ") || "CASH, ILOC");
  doc.moveDown(1);

  addSection(doc, "2. TERMS OF DEPOSIT", "");
  doc.fontSize(10).font("Helvetica").text(
    "The Principal/Indemnitor agrees to deposit the required collateral with the Surety or its designated agent. " +
    "Such collateral shall be held as security for the Principal's obligations under the General Indemnity Agreement " +
    "and shall be returned upon the full release and discharge of the underlying bond."
  );
  doc.moveDown(1);

  addSection(doc, "3. IRREVOCABLE LETTER OF CREDIT REQUIREMENTS", "");
  doc.fontSize(10).font("Helvetica").text(
    "If collateral is provided in the form of an Irrevocable Letter of Credit (ILOC), it must:\n" +
    "- Be issued by a bank acceptable to the Surety\n" +
    "- Be payable on sight upon presentation of a certificate of default\n" +
    "- Remain in effect for the duration of the bond plus 90 days\n" +
    "- Be automatically renewable"
  );
  doc.moveDown(1);

  addSection(doc, "4. RELEASE OF COLLATERAL", "");
  doc.fontSize(10).font("Helvetica").text(
    "Collateral shall be released within 30 days of the earlier of: (a) full performance of the bonded obligation, " +
    "(b) cancellation of the bond with consent of all parties, or (c) entry of a final judgment discharging the Surety."
  );

  addSignatureLine(doc, "Principal / Depositor");
  addSignatureLine(doc, "Surety Representative");

  doc.end();
  await new Promise<void>((resolve) => writeStream.on("finish", resolve));
}

async function generateSuretyTrustResolution(bond: any, suretyCase: any, trust: any, outputPath: string): Promise<void> {
  const doc = createPDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  addDocumentHeader(doc, "SURETY TRUST RESOLUTION", `Resolution No. ${Date.now()}`);

  doc.fontSize(10).font("Helvetica").text(
    `A Resolution of the Trustees of ${trust?.name || "the Surety Trust"} ` +
    `authorizing the issuance of a surety bond.`
  );
  doc.moveDown(1.5);

  addSection(doc, "RECITALS", "");
  doc.fontSize(10).font("Helvetica").text(
    `WHEREAS, the Trust is authorized to act as surety for ${trust?.allowedBondTypes?.join(", ") || "JUDGMENT"} bonds; and\n\n` +
    `WHEREAS, the Trust has received an application for a bond in the amount of ${formatCurrency(suretyCase?.bondPenalSum || bond.faceValue)}; and\n\n` +
    "WHEREAS, the underwriting analysis has been completed and the risk has been deemed acceptable;"
  );
  doc.moveDown(1);

  addSection(doc, "RESOLUTION", "");
  doc.fontSize(10).font("Helvetica").text(
    "NOW, THEREFORE, BE IT RESOLVED, that the Trustees hereby authorize the issuance of the following bond:\n\n"
  );
  addLabelValue(doc, "Bond Name", bond.name);
  addLabelValue(doc, "Bond Amount", formatCurrency(suretyCase?.bondPenalSum || bond.faceValue));
  addLabelValue(doc, "Case ID", String(suretyCase?.id || "N/A"));
  doc.moveDown(1);

  addSection(doc, "CONDITIONS", "");
  doc.fontSize(10).font("Helvetica").text(
    `1. Collateral in the amount of ${formatCurrency(suretyCase?.collateralRequiredAmount || 0)} shall be posted.\n` +
    "2. A General Indemnity Agreement shall be executed.\n" +
    "3. All premiums and fees shall be paid prior to bond execution.\n" +
    `4. ${suretyCase?.insuranceRequired === "YES" ? "Adequate insurance shall be maintained." : "Standard terms apply."}`
  );
  doc.moveDown(1);

  addSection(doc, "CERTIFICATION", "");
  doc.fontSize(10).font("Helvetica").text(
    "I hereby certify that the foregoing is a true and correct copy of a Resolution duly adopted by " +
    `the Trustees of ${trust?.name || "the Surety Trust"} at a meeting held on ${formatDate(new Date())}.`
  );

  addSignatureLine(doc, "Trustee / Secretary");

  doc.end();
  await new Promise<void>((resolve) => writeStream.on("finish", resolve));
}

async function generateExchangeOfferingSheet(bond: any, auction: any, outputPath: string): Promise<void> {
  const doc = createPDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  addDocumentHeader(doc, "EXCHANGE OFFERING SHEET", "Bond Auction Details");

  addSection(doc, "OFFERING SUMMARY", "");
  addLabelValue(doc, "Bond Name", bond.name);
  addLabelValue(doc, "Face Value", formatCurrency(bond.faceValue));
  addLabelValue(doc, "Reserve Price", formatCurrency(auction?.reservePrice || 0));
  addLabelValue(doc, "Bond Score", bond.bondScore ? `${bond.bondScore}/100` : "N/A");
  addLabelValue(doc, "Risk Tier", bond.riskTier || "Unrated");
  doc.moveDown(1);

  addSection(doc, "AUCTION DETAILS", "");
  addLabelValue(doc, "Auction Status", auction?.status || "N/A");
  addLabelValue(doc, "Auction Start", formatDate(auction?.startsAt));
  addLabelValue(doc, "Auction End", formatDate(auction?.endsAt));
  doc.moveDown(1);

  addSection(doc, "BOND CHARACTERISTICS", "");
  addLabelValue(doc, "Bond Type", bond.bondType || "JUDGMENT");
  addLabelValue(doc, "Currency", bond.currency || "USD");
  addLabelValue(doc, "Coupon Rate", bond.couponRate ? `${bond.couponRate}%` : "N/A");
  addLabelValue(doc, "Maturity Date", formatDate(bond.maturityDate));
  doc.moveDown(1);

  addSection(doc, "LEGAL FRAMEWORK", "");
  addLabelValue(doc, "Jurisdiction", bond.jurisdiction || "N/A");
  addLabelValue(doc, "Governing Law", bond.governingLaw || "N/A");
  addLabelValue(doc, "Perfection Status", bond.isPerfected ? "PERFECTED" : "PENDING");
  doc.moveDown(1);

  addSection(doc, "DISCLAIMER", "");
  doc.fontSize(8).font("Helvetica-Oblique").text(
    "This offering sheet is for informational purposes only and is not an offer to sell or solicitation of an offer to buy. " +
    "Prospective investors should conduct their own due diligence and consult with legal and financial advisors before bidding. " +
    "Past performance is not indicative of future results."
  );

  doc.end();
  await new Promise<void>((resolve) => writeStream.on("finish", resolve));
}

async function generateInvestorSubscription(bond: any, auction: any, investor: any, outputPath: string): Promise<void> {
  const doc = createPDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  addDocumentHeader(doc, "INVESTOR SUBSCRIPTION AGREEMENT", "Bond Purchase Agreement");

  doc.fontSize(10).font("Helvetica").text(
    `This Subscription Agreement ("Agreement") is entered into as of ${formatDate(new Date())} ` +
    `by and between the undersigned Investor and the Issuer of ${bond.name}.`
  );
  doc.moveDown(1);

  addSection(doc, "1. SUBSCRIPTION", "");
  doc.fontSize(10).font("Helvetica").text(
    `The Investor hereby subscribes for and agrees to purchase the bond described below ` +
    "in accordance with the terms set forth in this Agreement and the Offering Materials."
  );
  doc.moveDown(1);

  addSection(doc, "2. BOND DETAILS", "");
  addLabelValue(doc, "Bond Name", bond.name);
  addLabelValue(doc, "Face Value", formatCurrency(bond.faceValue));
  addLabelValue(doc, "CUSIP", bond.cusip || "To be assigned");
  doc.moveDown(1);

  addSection(doc, "3. PURCHASE PRICE", "");
  addLabelValue(doc, "Winning Bid Amount", "[TO BE COMPLETED]");
  addLabelValue(doc, "Settlement Date", "[TO BE COMPLETED]");
  doc.moveDown(1);

  addSection(doc, "4. INVESTOR INFORMATION", "");
  addLabelValue(doc, "Investor Name", investor?.name || "[TO BE COMPLETED]");
  addLabelValue(doc, "Investor Email", investor?.email || "[TO BE COMPLETED]");
  doc.moveDown(1);

  addSection(doc, "5. REPRESENTATIONS", "");
  doc.fontSize(10).font("Helvetica").text(
    "The Investor represents and warrants that:\n" +
    "- They are an accredited investor as defined by applicable securities laws\n" +
    "- They have received and reviewed all offering materials\n" +
    "- They understand the risks associated with this investment\n" +
    "- They have sufficient financial resources to bear the risk of loss"
  );

  addSignatureLine(doc, "Investor");
  addSignatureLine(doc, "Issuer Representative");

  doc.end();
  await new Promise<void>((resolve) => writeStream.on("finish", resolve));
}

async function generateTradeConfirmation(bond: any, auction: any, investor: any, outputPath: string): Promise<void> {
  const doc = createPDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  addDocumentHeader(doc, "TRADE CONFIRMATION", `Confirmation No. ${Date.now()}`);

  addSection(doc, "TRADE DETAILS", "");
  addLabelValue(doc, "Trade Date", formatDate(new Date()));
  addLabelValue(doc, "Settlement Date", "[T+2]");
  addLabelValue(doc, "Trade Type", "BUY");
  doc.moveDown(1);

  addSection(doc, "SECURITY INFORMATION", "");
  addLabelValue(doc, "Security Description", bond.name);
  addLabelValue(doc, "CUSIP", bond.cusip || "Pending");
  addLabelValue(doc, "Face Value", formatCurrency(bond.faceValue));
  doc.moveDown(1);

  addSection(doc, "TRANSACTION DETAILS", "");
  addLabelValue(doc, "Price", "[WINNING BID PRICE]");
  addLabelValue(doc, "Quantity", "1");
  addLabelValue(doc, "Gross Amount", "[TO BE CALCULATED]");
  addLabelValue(doc, "Commission/Fees", "[TO BE CALCULATED]");
  addLabelValue(doc, "Net Amount", "[TO BE CALCULATED]");
  doc.moveDown(1);

  addSection(doc, "BUYER INFORMATION", "");
  addLabelValue(doc, "Account Name", investor?.name || "[TO BE COMPLETED]");
  addLabelValue(doc, "Account Number", "[TO BE ASSIGNED]");
  doc.moveDown(1);

  addSection(doc, "SETTLEMENT INSTRUCTIONS", "");
  doc.fontSize(10).font("Helvetica").text(
    "Payment must be received by the settlement date. Wire transfer instructions will be provided separately. " +
    "Securities will be delivered via DTC or as otherwise agreed."
  );
  doc.moveDown(1);

  doc.fontSize(8).font("Helvetica-Oblique").text(
    "Please review this confirmation carefully. Report any discrepancies immediately. " +
    "This confirmation is subject to the terms and conditions of the Master Agreement.",
    { align: "center" }
  );

  doc.end();
  await new Promise<void>((resolve) => writeStream.on("finish", resolve));
}

async function generateTrustBoardMinutes(bond: any, trust: any, outputPath: string): Promise<void> {
  const doc = createPDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  addDocumentHeader(doc, "TRUST BOARD MINUTES", `Meeting Date: ${formatDate(new Date())}`);

  addSection(doc, "MEETING INFORMATION", "");
  addLabelValue(doc, "Trust Name", trust?.name || "Development Trust");
  addLabelValue(doc, "Meeting Type", "Special Meeting");
  addLabelValue(doc, "Location", "Via Teleconference");
  addLabelValue(doc, "Date", formatDate(new Date()));
  doc.moveDown(1);

  addSection(doc, "ATTENDEES", "");
  doc.fontSize(10).font("Helvetica").text(
    "Present: [LIST OF TRUSTEES]\n" +
    "Absent: None\n" +
    "Also Present: [LIST OF ADVISORS]"
  );
  doc.moveDown(1);

  addSection(doc, "CALL TO ORDER", "");
  doc.fontSize(10).font("Helvetica").text(
    "The meeting was called to order at [TIME]. A quorum was present and the meeting was duly convened."
  );
  doc.moveDown(1);

  addSection(doc, "BOND TRANSACTION REVIEW", "");
  doc.fontSize(10).font("Helvetica").text(
    `The Trustees reviewed the completed transaction for ${bond.name} ` +
    `with a face value of ${formatCurrency(bond.faceValue)}.`
  );
  doc.moveDown(1);

  addSection(doc, "ALLOCATION DISCUSSION", "");
  doc.fontSize(10).font("Helvetica").text(
    "The Trustees discussed the allocation of proceeds in accordance with the Trust Agreement and applicable law. " +
    "The proposed allocation was presented and reviewed."
  );
  doc.moveDown(1);

  addSection(doc, "RESOLUTIONS ADOPTED", "");
  doc.fontSize(10).font("Helvetica").text(
    "RESOLVED, that the Trust Administrator is authorized to allocate proceeds as presented.\n\n" +
    "RESOLVED, that all actions taken in connection with this transaction are hereby ratified."
  );
  doc.moveDown(1);

  addSection(doc, "ADJOURNMENT", "");
  doc.fontSize(10).font("Helvetica").text(
    "There being no further business, the meeting was adjourned at [TIME]."
  );

  addSignatureLine(doc, "Secretary / Trustee");

  doc.end();
  await new Promise<void>((resolve) => writeStream.on("finish", resolve));
}

async function generateTrustAllocationResolution(bond: any, trust: any, outputPath: string): Promise<void> {
  const doc = createPDFDocument();
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  addDocumentHeader(doc, "TRUST ALLOCATION RESOLUTION", `Resolution No. ${Date.now()}`);

  doc.fontSize(10).font("Helvetica").text(
    `A Resolution of ${trust?.name || "the Development Trust"} regarding the allocation of ` +
    `proceeds from the sale of ${bond.name}.`
  );
  doc.moveDown(1.5);

  addSection(doc, "RECITALS", "");
  doc.fontSize(10).font("Helvetica").text(
    `WHEREAS, the bond transaction for ${bond.name} has been successfully completed; and\n\n` +
    `WHEREAS, gross proceeds of ${formatCurrency(bond.faceValue)} have been received; and\n\n` +
    "WHEREAS, the Trust is required to allocate such proceeds in accordance with its governing documents;"
  );
  doc.moveDown(1);

  addSection(doc, "RESOLUTION", "");
  doc.fontSize(10).font("Helvetica").text(
    "NOW, THEREFORE, BE IT RESOLVED, that the Trust Administrator is hereby authorized and directed " +
    "to allocate the net proceeds as follows:"
  );
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica").text(
    "1. Operating Expenses Reserve: [X]%\n" +
    "2. Tax Reserve: [X]%\n" +
    "3. Project Development Fund: [X]%\n" +
    "4. Beneficiary Distributions: [X]%\n" +
    "5. Contingency Reserve: [X]%"
  );
  doc.moveDown(1);

  addSection(doc, "AUTHORIZATION", "");
  doc.fontSize(10).font("Helvetica").text(
    "The Trust Administrator is further authorized to execute all documents and take all actions " +
    "necessary to implement this allocation, including but not limited to wire transfers, " +
    "investment transactions, and beneficiary distributions."
  );
  doc.moveDown(1);

  addSection(doc, "CERTIFICATION", "");
  doc.fontSize(10).font("Helvetica").text(
    "I hereby certify that this is a true and correct copy of a resolution duly adopted by the Trustees " +
    `of ${trust?.name || "the Trust"} at a meeting held on ${formatDate(new Date())}.`
  );

  addSignatureLine(doc, "Trust Administrator");
  addSignatureLine(doc, "Trustee");

  doc.end();
  await new Promise<void>((resolve) => writeStream.on("finish", resolve));
}

export async function generateDocsForBondStep(
  input: GenerateDocsInput
): Promise<GeneratedDoc[]> {
  const { bondId, step, suretyCaseId, trustId, auctionId, investorId } = input;

  if (!ALLOWED_STEPS.includes(step)) {
    throw new Error(`Invalid step: ${step}. Allowed: ${ALLOWED_STEPS.join(", ")}`);
  }

  await ensureDocsDirectory();

  const bond = await getBondData(bondId);
  const suretyCase = suretyCaseId ? await getSuretyCaseData(suretyCaseId) : null;
  const trust = trustId ? await getSuretyTrustData(trustId) : 
    (suretyCase?.suretyTrustId ? await getSuretyTrustData(suretyCase.suretyTrustId) : null);
  const auction = auctionId ? await getAuctionData(auctionId) : 
    (bond.currentAuctionId ? await getAuctionData(bond.currentAuctionId) : null);
  const investor = investorId ? await getUserData(investorId) : null;

  const docsToCreate = STEP_DOC_MAP[step];
  const generated: GeneratedDoc[] = [];

  for (const docType of docsToCreate) {
    const timestamp = Date.now();
    const fileName = `${docType}_${bondId}_${timestamp}.pdf`;
    const storagePath = path.join(DOCS_DIR, fileName);

    switch (docType) {
      case "BOND_TERM_SHEET":
        await generateBondTermSheet(bond, storagePath);
        break;
      case "BOND_INSTRUMENT":
        await generateBondInstrument(bond, storagePath);
        break;
      case "PERFECTION_CERT":
        await generatePerfectionCert(bond, storagePath);
        break;
      case "UNDERWRITING_REPORT":
        await generateUnderwritingReport(bond, suretyCase, trust, storagePath);
        break;
      case "GIA":
        await generateGIA(bond, suretyCase, trust, storagePath);
        break;
      case "COLLATERAL_AGREEMENT":
        await generateCollateralAgreement(bond, suretyCase, storagePath);
        break;
      case "SURETY_TRUST_RESOLUTION":
        await generateSuretyTrustResolution(bond, suretyCase, trust, storagePath);
        break;
      case "EXCHANGE_OFFERING_SHEET":
        await generateExchangeOfferingSheet(bond, auction, storagePath);
        break;
      case "INVESTOR_SUBSCRIPTION":
        await generateInvestorSubscription(bond, auction, investor, storagePath);
        break;
      case "TRADE_CONFIRMATION":
        await generateTradeConfirmation(bond, auction, investor, storagePath);
        break;
      case "TRUST_BOARD_MINUTES":
        await generateTrustBoardMinutes(bond, trust, storagePath);
        break;
      case "TRUST_ALLOCATION_RESOLUTION":
        await generateTrustAllocationResolution(bond, trust, storagePath);
        break;
    }

    generated.push({
      id: `${docType}_${timestamp}`,
      docType,
      label: DOC_TYPE_LABELS[docType],
      storagePath: `/generated_docs/${fileName}`,
      generatedAt: new Date(),
    });
  }

  return generated;
}

export function getAvailableSteps(): { step: BondProcessStep; label: string; docTypes: DocType[] }[] {
  return ALLOWED_STEPS.map(step => ({
    step,
    label: step.replace(/_/g, " "),
    docTypes: STEP_DOC_MAP[step],
  }));
}

export function getDocTypesForStep(step: BondProcessStep): DocType[] {
  return STEP_DOC_MAP[step] || [];
}
