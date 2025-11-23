// server/services/bondExtractionService.ts
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import mammoth from "mammoth";
import { config } from "../config";
import { z } from "zod";

const openai = config.openai.enabled
  ? new OpenAI({
      baseURL: config.openai.baseUrl,
      apiKey: config.openai.apiKey,
    })
  : null;

// Zod schema for validating AI extraction response
const bondExtractionSchema = z.object({
  issuerName: z.string().nullable(),
  bondName: z.string().nullable(),
  cusip: z.string().nullable(),
  isin: z.string().nullable(),
  ticker: z.string().nullable(),
  faceValue: z.preprocess(
    (val) => (val != null && val !== "" ? Number(val) : null),
    z.number().nullable()
  ),
  currency: z.string().nullable(),
  couponRate: z.preprocess(
    (val) => (val != null && val !== "" ? Number(val) : null),
    z.number().nullable()
  ),
  couponType: z.string().nullable(),
  maturityDate: z.string().nullable(),
  issueDate: z.string().nullable(),
  jurisdiction: z.string().nullable(),
  governingLaw: z.string().nullable(),
  bondScore: z.preprocess(
    (val) => {
      if (val == null || val === "") return undefined;
      const num = Number(val);
      return Number.isFinite(num) ? num : undefined;
    },
    z.number().min(0).max(100)
  ),
  riskTier: z.enum(["low", "moderate", "high"]),
  warnings: z.array(z.string()).default([]),
  rawFields: z.record(z.unknown()).optional(),
});

export interface BondExtractionResult {
  issuerName: string | null;
  bondName: string | null;
  cusip: string | null;
  isin: string | null;
  ticker: string | null;
  faceValue: number | null;
  currency: string | null;
  couponRate: number | null;
  couponType: string | null;
  maturityDate: string | null; // YYYY-MM-DD
  issueDate: string | null;    // YYYY-MM-DD
  jurisdiction: string | null;
  governingLaw: string | null;
  bondScore: number;           // 0–100
  riskTier: "low" | "moderate" | "high";
  warnings: string[];
  rawFields: Record<string, unknown>;
}

async function extractTextFromFile(
  filePath: string,
  mimeType: string
): Promise<string> {
  const resolved = path.resolve(filePath);
  const buffer = await fs.readFile(resolved);

  if (mimeType === "application/pdf" || filePath.toLowerCase().endsWith(".pdf")) {
    // pdf-parse v2 uses class-based API
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text || "";
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filePath.toLowerCase().endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  // unsupported types for now
  return "";
}

export async function extractBondDataFromDocument(
  filePath: string,
  mimeType: string
): Promise<BondExtractionResult> {
  if (!openai) {
    throw new Error("Bond extraction service not configured - OpenAI integration required");
  }

  const text = await extractTextFromFile(filePath, mimeType);
  if (!text.trim()) {
    throw new Error("Bond document appears to be empty or unreadable");
  }

  const truncated = text.length > 16000 ? text.slice(0, 16000) : text;

  const systemPrompt = `
You are a fixed-income and bond document extraction specialist.
You read bond indentures, note forms, offering memoranda, term sheets, and similar documents
and extract structured data fields plus a simple 0–100 risk/quality score.

Rules:
- Use ONLY the text provided.
- If you are unsure about a field, set it to null; do NOT guess or invent identifiers or dates.
- Never fabricate a CUSIP, ISIN, ticker, or dates that are not clearly present.
- Always respond with strictly valid JSON matching the requested schema.
- Do NOT include explanations or chain-of-thought, only the JSON object.
- The bondScore is a 0–100 ordinal indicator for internal analytics and education only, not investment, legal, or tax advice.
`.trim();

  const userPrompt = `
Extract structured data about this bond from the following document text.

Return a single JSON object with ALL of these keys:

- issuerName: string | null
- bondName: string | null
- cusip: string | null
- isin: string | null
- ticker: string | null
- faceValue: number | null           // principal / par amount in the stated currency
- currency: string | null            // 3-letter code like "USD", "EUR"
- couponRate: number | null          // annual coupon rate as a percentage, e.g. 5.75 for 5.75%
- couponType: string | null          // e.g. "fixed", "floating", "zero-coupon", "step-up"
- maturityDate: string | null        // YYYY-MM-DD if a maturity date is specified
- issueDate: string | null           // YYYY-MM-DD if an issue date is specified
- jurisdiction: string | null        // e.g. "United States", "State of New York"
- governingLaw: string | null        // e.g. "laws of the State of New York"
- bondScore: number                  // 0–100 where higher generally indicates stronger credit profile & protections
- riskTier: string                   // one of "low", "moderate", "high" based on the bondScore and the terms
- warnings: string[]                 // list of short cautionary flags (max 10), or [] if none
- rawFields: object                  // any additional raw extracted fields that may be useful

Document text:
${truncated}

Return JSON only, no markdown, no comments.
`.trim();

  const completion = await openai.chat.completions.create({
    model: "gpt-5",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: 1024,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI bond extraction returned empty response");
  }

  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(content);
  } catch {
    throw new Error("Failed to parse AI bond extraction JSON");
  }

  // Validate with Zod schema
  const validation = bondExtractionSchema.safeParse(rawParsed);
  if (!validation.success) {
    console.error("Bond extraction validation errors:", validation.error.errors);
    throw new Error(`AI response validation failed: ${validation.error.errors.map(e => e.message).join(", ")}`);
  }

  const parsed = validation.data;

  const faceValue =
    typeof parsed.faceValue === "number"
      ? parsed.faceValue
      : parsed.faceValue != null
      ? Number(parsed.faceValue)
      : null;

  const couponRate =
    typeof parsed.couponRate === "number"
      ? parsed.couponRate
      : parsed.couponRate != null
      ? Number(parsed.couponRate)
      : null;

  let bondScore =
    typeof parsed.bondScore === "number"
      ? parsed.bondScore
      : parsed.bondScore != null
      ? Number(parsed.bondScore)
      : NaN;

  if (!Number.isFinite(bondScore)) {
    bondScore = 0;
  }
  bondScore = Math.min(100, Math.max(0, bondScore));

  let riskTier: "low" | "moderate" | "high" = "moderate";
  if (bondScore >= 70) riskTier = "low";
  else if (bondScore < 40) riskTier = "high";

  const warnings: string[] = Array.isArray(parsed.warnings)
    ? parsed.warnings.filter((w: unknown) => typeof w === "string")
    : [];

  const result: BondExtractionResult = {
    issuerName: parsed.issuerName ?? null,
    bondName: parsed.bondName ?? null,
    cusip: parsed.cusip ?? null,
    isin: parsed.isin ?? null,
    ticker: parsed.ticker ?? null,
    faceValue: Number.isFinite(faceValue as number) ? (faceValue as number) : null,
    currency: parsed.currency ?? null,
    couponRate: Number.isFinite(couponRate as number) ? (couponRate as number) : null,
    couponType: parsed.couponType ?? null,
    maturityDate: parsed.maturityDate ?? null,
    issueDate: parsed.issueDate ?? null,
    jurisdiction: parsed.jurisdiction ?? null,
    governingLaw: parsed.governingLaw ?? null,
    bondScore,
    riskTier,
    warnings,
    rawFields: parsed,
  };

  return result;
}
