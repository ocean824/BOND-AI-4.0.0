// server/services/bondAiService.ts
import OpenAI from "openai";
import { config } from "../config";
import type { Bond } from "@shared/schema";

const openai = config.openai.enabled
  ? new OpenAI({
      baseURL: config.openai.baseUrl,
      apiKey: config.openai.apiKey,
    })
  : null;

function formatBondForPrompt(bond: Bond): string {
  return [
    `Name: ${bond.name}`,
    bond.cusip ? `CUSIP: ${bond.cusip}` : null,
    bond.isin ? `ISIN: ${bond.isin}` : null,
    bond.ticker ? `Ticker: ${bond.ticker}` : null,
    bond.faceValue != null ? `Face value: ${bond.faceValue} ${bond.currency || "USD"}` : null,
    bond.couponRate != null ? `Coupon: ${bond.couponRate}%` : null,
    bond.couponType ? `Coupon type: ${bond.couponType}` : null,
    bond.maturityDate ? `Maturity date: ${bond.maturityDate}` : null,
    bond.issueDate ? `Issue date: ${bond.issueDate}` : null,
    bond.jurisdiction ? `Jurisdiction: ${bond.jurisdiction}` : null,
    bond.governingLaw ? `Governing law: ${bond.governingLaw}` : null,
    bond.status ? `Status: ${bond.status}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM_PROMPT = `
You help structure and edit *draft* bond documents based on real user-provided data.

Important constraints:
- Use ONLY facts explicitly provided about the bond and any high-level purpose the user states.
- Do NOT fabricate legal parties, covenants, or numbers that were not provided.
- You may propose generic boilerplate clauses, but keep them clearly generic (e.g., "Issuer and Holder" instead of naming parties).
- Do NOT give legal advice. Make it clear that drafts must be reviewed by qualified counsel.
- Never reveal chain-of-thought; reason internally and output only the final text.
`.trim();

export async function generateBondDraft(
  bond: Bond,
  options?: { purpose?: string; style?: "term_sheet" | "summary" | "indenture_outline" }
): Promise<string> {
  if (!openai) {
    throw new Error("OpenAI is not configured; bond draft generation is unavailable.");
  }

  const style = options?.style ?? "term_sheet";
  const purpose = options?.purpose?.trim();

  const bondSnippet = formatBondForPrompt(bond);

  const userPrompt = [
    "Create a draft bond document outline for the following real bond instrument.",
    "",
    "Bond data:",
    bondSnippet,
    "",
    purpose ? `Stated purpose/notes: ${purpose}` : "",
    "",
    "Output requirements:",
    style === "term_sheet"
      ? "- A clear, concise term sheet style document summarizing key economic terms."
      : style === "indenture_outline"
      ? "- An outline of major sections you would expect in a bond indenture for this instrument."
      : "- A narrative summary of the bond and its economic terms.",
    "- Keep tone neutral and informational.",
    "- Explicitly state that this is a draft and not legal advice.",
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: 2048,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Bond draft generation returned empty content");
  }

  return content;
}

export async function editBondDraft(
  bond: Bond,
  existingDraft: string,
  instructions: string
): Promise<string> {
  if (!openai) {
    throw new Error("OpenAI is not configured; bond draft editing is unavailable.");
  }

  const bondSnippet = formatBondForPrompt(bond);

  const userPrompt = [
    "You are revising an existing *draft* bond document.",
    "",
    "Real bond data (do NOT contradict these facts):",
    bondSnippet,
    "",
    "Existing draft text:",
    existingDraft,
    "",
    "User instructions / requested edits:",
    instructions,
    "",
    "Apply only changes that are consistent with the bond data. If user requests something that conflicts with the data,",
    "prioritize the explicit bond data and state that the draft should be clarified by counsel.",
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: 2048,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Bond draft editing returned empty content");
  }

  return content;
}
