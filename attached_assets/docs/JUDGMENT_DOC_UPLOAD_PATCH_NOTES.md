# Judgment Document Drag & Drop Upload – Patch Notes

This document explains how to integrate the drag-and-drop judgment document upload
feature into your existing BondAI codebase.

The pack includes:
- `server/routes.judgments-extract-from-doc-snippet.ts`
- `client/src/components/judgment-doc-dropzone.tsx`
- `README_JUDGMENT_DOC_UPLOAD.md`
- `server/openapi.judgments-extract-from-doc.yml`

---

## 1. Install dependencies

In your Replit shell (inside the BondAI project):

```bash
npm install multer pdf-parse mammoth
```

---

## 2. Backend: server/routes.ts

### 2.1 Imports

Add these imports near the top of `server/routes.ts`:

```ts
import multer from "multer";
import pdfParse from "pdf-parse";
import * as mammoth from "mammoth";
import { extractJudgmentData } from "./services/aiExtractionService";
```

### 2.2 Multer config

Inside `registerRoutes(app: Express)`, add:

```ts
const judgmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
});
```

### 2.3 New route

Copy the `app.post("/api/judgments/extract-from-doc", ...)` block from
`server/routes.judgments-extract-from-doc-snippet.ts` into `server/routes.ts`
inside `registerRoutes`, near your other `/api/judgments` routes.

This endpoint:
- Accepts a single file field named `file` in multipart/form-data.
- Supports only PDF and Word (.docx, .doc). Other types return 400.
- Uses `pdf-parse` or `mammoth` to get real text from the file.
- Calls `extractJudgmentData(text)` and returns:

```jsonc
{
  "debtorName": "string",
  "caseNumber": "string | null",
  "judgmentAmount": 12345.67,
  "notes": "optional string | null"
}
```

No mock values are ever added. All data comes from the real document text.

---

## 3. Frontend: drag-and-drop component

### 3.1 Add component file

Copy `client/src/components/judgment-doc-dropzone.tsx` from this pack into your
app under the same path: `client/src/components/judgment-doc-dropzone.tsx`.

Make sure your project already has:

- `@/hooks/use-toast`
- `@/lib/utils` with `cn()`
- `@tanstack/react-query` and `lucide-react` set up

If names differ, adjust imports accordingly.

### 3.2 Wire into Judgments page

Open `client/src/pages/judgments.tsx` and:

1. Add the import:

```ts
import { JudgmentDocDropzone } from "@/components/judgment-doc-dropzone";
```

2. Ensure your upload form state includes these fields (names can be adjusted, but must match):

```ts
const [uploadForm, setUploadForm] = useState({
  debtorName: "",
  caseNumber: "",
  judgmentAmount: "",
  notes: "",
});
```

3. Inside the "Upload Judgment" card, at the top of the form, render the dropzone
   and hook it into your form state, e.g.:

```tsx
<CardContent className="space-y-4">
  <JudgmentDocDropzone
    onExtract={(data) =>
      setUploadForm((prev) => ({
        ...prev,
        debtorName: data.debtorName ?? prev.debtorName,
        caseNumber: data.caseNumber ?? prev.caseNumber,
        judgmentAmount:
          data.judgmentAmount != null
            ? String(data.judgmentAmount)
            : prev.judgmentAmount,
        notes: data.notes ?? prev.notes,
      }))
    }
  />

  {/* existing manual fields for debtorName, caseNumber, judgmentAmount, notes go here */}
</CardContent>
```

Your existing submit handler (`handleUpload`) can stay the same. The form is now
auto-filled from the document, but still fully editable.

---

## 4. OpenAPI

The file `server/openapi.judgments-extract-from-doc.yml` contains a ready-made
path and schema snippet for `/api/judgments/extract-from-doc`.

Merge its contents into `server/openapi.yml` under `paths:` and `components.schemas`.

---

## 5. Real-data-only guarantee

- The backend never invents debtor names, case numbers, or judgment amounts.
- All extraction goes through your existing `extractJudgmentData(text)` pipeline.
- The frontend dropzone only displays and merges values returned by the endpoint;
  it has no built-in defaults or mock data.

Once wired, you can test by:
1. Running the app.
2. Navigating to the Judgments → Upload Judgment section.
3. Dragging a real judgment PDF / Word document into the dropzone.
4. Confirming that the form fields populate correctly.
