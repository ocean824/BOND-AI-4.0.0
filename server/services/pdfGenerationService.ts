import PDFDocument from "pdfkit";

interface TrancheSummary {
  tranche: string;
  count: number;
  totalFaceValue: number;
  totalRecommendedPrice: number;
}

interface JudgmentDetail {
  debtorName: string;
  caseNumber: string;
  court: string;
  jurisdiction: string;
  judgmentAmount: string;
  tranche: string;
}

interface BundleTeaserData {
  bundleName: string;
  bundleDescription: string;
  createdAt: string;
  totalFaceValue: number;
  totalRecommendedPrice: number;
  judgmentCount: number;
  avgRecoveryRate: number;
  tranches: TrancheSummary[];
  judgments: JudgmentDetail[];
}

export function generateInvestorTeaserPDF(data: BundleTeaserData) {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });

  // Title
  doc.fontSize(24).font("Helvetica-Bold").text("Judgment Bond Investment Teaser", {
    align: "center",
  });

  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica").fillColor("#666666").text(
    "Confidential - For Institutional Investors Only",
    { align: "center" }
  );

  doc.moveDown(2);

  // Bundle Overview
  doc.fontSize(16).font("Helvetica-Bold").fillColor("#000000").text("Bundle Overview");
  doc.moveDown(0.5);
  
  doc.fontSize(12).font("Helvetica");
  doc.text(`Bundle Name: ${data.bundleName}`);
  doc.text(`Description: ${data.bundleDescription || "N/A"}`);
  doc.text(`Created: ${new Date(data.createdAt).toLocaleDateString()}`);

  doc.moveDown(1.5);

  // Executive Summary
  doc.fontSize(16).font("Helvetica-Bold").text("Executive Summary");
  doc.moveDown(0.5);

  const expectedReturn = data.totalRecommendedPrice > 0 
    ? ((data.totalFaceValue / data.totalRecommendedPrice - 1) * 100).toFixed(1) 
    : "N/A";
    
  const summaryData = [
    ["Total Face Value:", `$${data.totalFaceValue.toLocaleString()}`],
    ["Recommended Purchase Price:", `$${data.totalRecommendedPrice.toLocaleString()}`],
    ["Number of Judgments:", data.judgmentCount.toString()],
    ["Average Recovery Rate:", `${data.avgRecoveryRate.toFixed(1)}%`],
    ["Expected Return:", typeof expectedReturn === "string" ? expectedReturn : `${expectedReturn}%`],
  ];

  doc.fontSize(11).font("Helvetica");
  summaryData.forEach(([label, value]) => {
    doc.text(label, { continued: true, width: 250 });
    doc.font("Helvetica-Bold").text(value, { align: "right" });
    doc.font("Helvetica");
    doc.moveDown(0.3);
  });

  doc.moveDown(1.5);

  // Tranche Breakdown
  doc.fontSize(16).font("Helvetica-Bold").text("Tranche Breakdown");
  doc.moveDown(0.5);

  // Table header
  const tableTop = doc.y;
  const col1X = 50;
  const col2X = 200;
  const col3X = 340;
  const col4X = 480;

  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("Tranche", col1X, tableTop);
  doc.text("Count", col2X, tableTop);
  doc.text("Face Value", col3X, tableTop);
  doc.text("Purchase Price", col4X, tableTop);

  doc.moveTo(col1X, tableTop + 15).lineTo(562, tableTop + 15).stroke();

  let currentY = tableTop + 25;
  doc.font("Helvetica").fontSize(10);

  data.tranches.forEach((tranche) => {
    doc.text(tranche.tranche, col1X, currentY);
    doc.text(tranche.count.toString(), col2X, currentY);
    doc.text(`$${tranche.totalFaceValue.toLocaleString()}`, col3X, currentY);
    doc.text(`$${tranche.totalRecommendedPrice.toLocaleString()}`, col4X, currentY);
    currentY += 20;
  });

  doc.moveDown(2);

  // Add new page for judgment details
  doc.addPage();

  // Judgment Details
  doc.fontSize(16).font("Helvetica-Bold").text("Judgment Portfolio Details");
  doc.moveDown(1);

  doc.fontSize(9).font("Helvetica");
  data.judgments.forEach((judgment, index) => {
    if (index > 0 && index % 8 === 0) {
      doc.addPage();
      doc.fontSize(9).font("Helvetica");
    }

    doc.font("Helvetica-Bold").text(`${index + 1}. ${judgment.debtorName}`);
    doc.font("Helvetica");
    doc.text(`   Case Number: ${judgment.caseNumber}`);
    doc.text(`   Court: ${judgment.court}`);
    doc.text(`   Jurisdiction: ${judgment.jurisdiction}`);
    doc.text(`   Judgment Amount: ${judgment.judgmentAmount}`);
    doc.text(`   Tranche: ${judgment.tranche}`);
    doc.moveDown(0.8);
  });

  // Footer disclaimer
  doc.addPage();
  doc.fontSize(10).font("Helvetica-Bold").text("Important Disclaimers");
  doc.moveDown(0.5);
  doc.fontSize(8).font("Helvetica").text(
    "This teaser is provided for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any securities. " +
    "All information contained herein is subject to verification and may be subject to change without notice. " +
    "Potential investors should conduct their own due diligence and consult with their legal, tax, and financial advisors. " +
    "Past performance does not guarantee future results. Investing in judgment portfolios involves significant risk, including the possible loss of principal.",
    { align: "justify" }
  );

  // Note: Do not call doc.end() here - let the caller pipe the stream first
  return doc;
}
