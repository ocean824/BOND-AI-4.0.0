# Judgment Document Drag & Drop Upload Feature Pack

This feature pack contains all code and patch notes for adding a drag-and-drop
judgment document upload flow to your BondAI app.

Highlights:
- Drag & drop or click-to-upload PDF / Word (.docx) judgment documents.
- Backend endpoint `/api/judgments/extract-from-doc` that:
  - Accepts a single file field named `file` (multipart/form-data).
  - Supports PDF and Word (.docx) only.
  - Extracts real text from the file.
  - Uses your existing `extractJudgmentData(text)` AI helper to pull
    `debtorName`, `caseNumber`, `judgmentAmount`, and optional `notes`.
- Frontend `JudgmentDocDropzone` component that:
  - Calls the endpoint.
  - Auto-fills the existing "Upload Judgment" form fields.
  - Never uses mock data or fabricated values.

See `docs/JUDGMENT_DOC_UPLOAD_PATCH_NOTES.md` for exact integration steps.
