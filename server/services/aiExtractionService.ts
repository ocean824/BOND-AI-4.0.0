// Reference: javascript_openai_ai_integrations blueprint
import OpenAI from "openai";
import { config } from "../config";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = config.openai.enabled ? new OpenAI({
  baseURL: config.openai.baseUrl,
  apiKey: config.openai.apiKey
}) : null;

export interface ExtractionResult {
  debtorName: string;
  caseNumber: string;
  court: string;
  jurisdiction: string;
  judgmentAmount: number;
  judgmentDate: string;
  confidence: number;
  rawFields?: Record<string, any>;
}

export async function extractJudgmentData(rawText: string): Promise<ExtractionResult> {
  if (!openai) {
    console.error("AI extraction unavailable: OpenAI integration not configured");
    return {
      debtorName: "AI Service Unavailable",
      caseNumber: "N/A",
      court: "N/A",
      jurisdiction: "N/A",
      judgmentAmount: 0,
      judgmentDate: new Date().toISOString().split('T')[0],
      confidence: 0,
      rawFields: { error: "AI extraction service is not configured. Please set up OpenAI integration." },
    };
  }

  try {
    const prompt = `Extract structured data from this legal judgment document. Return ONLY valid JSON with no markdown formatting.

Required fields:
- debtorName: Full name of the debtor
- caseNumber: Court case number
- court: Name of the court
- jurisdiction: Legal jurisdiction (state/county)
- judgmentAmount: Judgment amount in dollars (number only)
- judgmentDate: Date of judgment (YYYY-MM-DD format)
- confidence: Your confidence in this extraction (0-100)

Document text:
${rawText}

Return JSON only:`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a legal document extraction specialist. Extract structured data from judgment documents accurately. Always respond with valid JSON only."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const extracted = JSON.parse(content);

    // Validate and provide defaults
    return {
      debtorName: extracted.debtorName || "Unknown Debtor",
      caseNumber: extracted.caseNumber || "N/A",
      court: extracted.court || "Unknown Court",
      jurisdiction: extracted.jurisdiction || "Unknown",
      judgmentAmount: parseFloat(extracted.judgmentAmount) || 0,
      judgmentDate: extracted.judgmentDate || new Date().toISOString().split('T')[0],
      confidence: Math.min(100, Math.max(0, extracted.confidence || 75)),
      rawFields: extracted,
    };
  } catch (error) {
    console.error("AI extraction error:", error);
    // Return safe defaults on error
    return {
      debtorName: "Extraction Failed",
      caseNumber: "N/A",
      court: "N/A",
      jurisdiction: "N/A",
      judgmentAmount: 0,
      judgmentDate: new Date().toISOString().split('T')[0],
      confidence: 0,
      rawFields: { error: String(error) },
    };
  }
}

// Dual-mode extraction stub (Claude + GPT)
export async function dualModeExtraction(rawText: string): Promise<ExtractionResult> {
  // Primary extraction with GPT
  const gptResult = await extractJudgmentData(rawText);
  
  // Claude stub - would require ANTHROPIC_API_KEY
  // For now, we rely on GPT-5 which is highly accurate
  // In production, you could run both and merge results for higher confidence
  
  return gptResult;
}

export async function generateChatResponse(message: string, context?: string): Promise<string> {
  if (!openai) {
    return "I apologize, but the AI chat service is not currently configured. Please contact support to enable AI assistance features.";
  }

  try {
    const systemPrompt = `You are a helpful AI assistant for the Judgment Bond AI Platform. 
You help users understand:
- How to upload and analyze judgments
- Pricing scenarios (base, optimistic, stressed)
- Creating bundles and assigning tranches (Senior, Mezzanine, Equity)
- Interpreting investor metrics and portfolio analytics

Provide clear, concise, professional guidance. Remember that all AI outputs are for informational purposes only and do not constitute legal or investment advice.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: context ? `Context: ${context}\n\nQuestion: ${message}` : message }
      ],
      max_completion_tokens: 8192,
    });

    return response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Chat generation error:", error);
    return "I'm having trouble generating a response right now. Please try again in a moment.";
  }
}
