// server/routes.judgments-extract-from-doc-snippet.ts
// This file is a *snippet* showing how to wire the judgment document extraction endpoint
// into your existing Express app in server/routes.ts.

import multer from "multer";
import pdfParse from "pdf-parse";
import * as mammoth from "mammoth";
import type { AuthRequest } from "./authMiddleware";
import { extractJudgmentData } from "./services/aiExtractionService";

// Inside registerRoutes(app: Express):

const judgmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
});

app.post(
  "/api/judgments/extract-from-doc",
  authMiddleware,
  judgmentUpload.single("file"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "File is required" });
      }

      const mime = req.file.mimetype;
      const originalName = req.file.originalname.toLowerCase();
      const buffer = req.file.buffer;

      let text = "";

      // PDF → text
      if (mime === "application/pdf" || originalName.endsWith(".pdf")) {
        const parsed = await pdfParse(buffer);
        text = parsed.text || "";
      }
      // DOCX / DOC → text (Word)
      else if (
        mime ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mime === "application/msword" ||
        originalName.endsWith(".docx")
      ) {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || "";
      } else {
        return res.status(400).json({
          error: "Unsupported file type. Please upload a PDF or Word (.docx) judgment.",
        });
      }

      if (!text.trim()) {
        return res.status(422).json({
          error: "Unable to read text from the document.",
        });
      }

      // 🔍 Use the existing AI extractor – REAL DATA ONLY
      const extraction = await extractJudgmentData(text);

      const notesParts: string[] = [];
      if ((extraction as any).court) notesParts.push(`Court: ${(extraction as any).court}`);
      if ((extraction as any).jurisdiction)
        notesParts.push(`Jurisdiction: ${(extraction as any).jurisdiction}`);
      if ((extraction as any).judgmentDate)
        notesParts.push(`Judgment date: ${(extraction as any).judgmentDate}`);

      const notes = notesParts.length ? notesParts.join(" | ") : undefined;

      return res.json({
        debtorName: extraction.debtorName,
        caseNumber: extraction.caseNumber ?? null,
        judgmentAmount: extraction.judgmentAmount,
        notes,
      });
    } catch (error: any) {
      console.error("Judgment doc extraction error:", error);
      return res.status(500).json({
        error: "Failed to extract judgment data from document",
        message: error?.message ?? "Unexpected error",
      });
    }
  },
);
