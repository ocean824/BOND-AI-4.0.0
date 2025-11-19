# BONDS Feature Patch Notes

This document describes how to wire the BONDS feature into your existing **BondAI** app.

The code files in this pack are:

- `server/services/bondAiService.ts`
- `server/services/bondDocumentAiService.ts`
- `client/src/pages/bonds.tsx`
- `README_BONDS.md` (overview)

You still need to patch your existing **schema, storage, routes, and nav** as described below.

---

## 1. Database schema (`shared/schema.ts`)

Add the following table definitions after your existing `bundleJudgments` definitions:

```ts
export const bonds = pgTable("bonds", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  cusip: varchar("cusip", { length: 20 }),
  isin: varchar("isin", { length: 20 }),
  ticker: varchar("ticker", { length: 20 }),
  faceValue: decimal("face_value", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  couponRate: decimal("coupon_rate", { precision: 6, scale: 3 }),
  couponType: varchar("coupon_type", { length: 50 }).default("fixed"),
  maturityDate: timestamp("maturity_date", { withTimezone: true }),
  issueDate: timestamp("issue_date", { withTimezone: true }),
  jurisdiction: varchar("jurisdiction", { length: 255 }),
  governingLaw: varchar("governing_law", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bondDocuments = pgTable("bond_documents", {
  id: serial("id").primaryKey(),
  bondId: integer("bond_id").notNull().references(() => bonds.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  filename: varchar("filename", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storagePath: varchar("storage_path", { length: 1000 }).notNull(),
  kind: varchar("kind", { length: 20 }).notNull().default("supporting"),
  description: text("description"),
  aiSummary: text("ai_summary"),
  tags: jsonb("tags"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Relations:

```ts
export const bondsRelations = relations(bonds, ({ one, many }) => ({
  owner: one(users, {
    fields: [bonds.ownerId],
    references: [users.id],
  }),
  documents: many(bondDocuments),
}));

export const bondDocumentsRelations = relations(bondDocuments, ({ one }) => ({
  bond: one(bonds, {
    fields: [bondDocuments.bondId],
    references: [bonds.id],
  }),
  owner: one(users, {
    fields: [bondDocuments.ownerId],
    references: [users.id],
  }),
}));
```

Insert schemas and types:

```ts
export const insertBondSchema = createInsertSchema(bonds, {
  name: z.string().min(1, "Bond name is required"),
  faceValue: z
    .string()
    .or(z.number())
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .refine((v) => !Number.isNaN(v), "Face value must be a number"),
});

export const insertBondDocumentSchema = createInsertSchema(bondDocuments);

export type Bond = typeof bonds.$inferSelect;
export type InsertBond = typeof bonds.$inferInsert;
export type BondDocument = typeof bondDocuments.$inferSelect;
export type InsertBondDocument = typeof bondDocuments.$inferInsert;
```

(Adjust field validations as you wish; keep the **real data only** rule.)

---

## 2. Storage (`server/storage.ts`)

At the top, import the new tables and types:

```ts
import {
  bonds,
  type Bond,
  type InsertBond,
  bondDocuments,
  type BondDocument,
  type InsertBondDocument,
  // ...existing imports
} from "@shared/schema";
```

Extend `IStorage`:

```ts
// Bonds
getBonds(ownerId: number): Promise<Bond[]>;
getBond(id: number): Promise<Bond | undefined>;
createBond(bond: InsertBond): Promise<Bond>;
updateBond(id: number, data: Partial<InsertBond>): Promise<Bond>;

// Bond documents
createBondDocument(doc: InsertBondDocument): Promise<BondDocument>;
getBondDocuments(bondId: number, ownerId: number): Promise<BondDocument[]>;
searchBondDocuments(ownerId: number, query: string): Promise<BondDocument[]>;
```

Then implement these methods in `DatabaseStorage` using Drizzle `select` / `insert` / `update`.

---

## 3. Routes (`server/routes.ts`)

### 3.1 Imports

Add:

```ts
import multer from "multer";
import path from "path";
import fs from "fs";
import { bonds, bondDocuments } from "@shared/schema";
import { insertBondSchema } from "@shared/schema";
import { summarizeBondDocumentFromFile } from "./services/bondDocumentAiService";
import { generateBondDraft, editBondDraft } from "./services/bondAiService";
```

(If `multer`, `path`, or `fs` are already imported, just extend as needed.)

Configure Multer somewhere near the top:

```ts
const upload = multer({
  dest: process.env.BOND_DOC_UPLOAD_DIR || "uploads/bond-docs",
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
});
```

### 3.2 REST endpoints

#### `GET /api/bonds`

Return all bonds for the authenticated user:

```ts
app.get("/api/bonds", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const bonds = await storage.getBonds(req.user!.id);
    res.json(bonds);
  } catch (error) {
    console.error("List bonds error:", error);
    res.status(500).json({ error: "Failed to list bonds" });
  }
});
```

#### `POST /api/bonds`

Create a bond using `insertBondSchema`:

```ts
app.post("/api/bonds", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = insertBondSchema.parse({
      ...req.body,
      ownerId: req.user!.id,
    });

    const created = await storage.createBond(parsed);
    res.status(201).json(created);
  } catch (error: any) {
    console.error("Create bond error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create bond" });
  }
});
```

#### `GET /api/bonds/:id`

Return bond + documents for that user:

```ts
app.get("/api/bonds/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const bond = await storage.getBond(id);
    if (!bond || bond.ownerId !== req.user!.id) {
      return res.status(404).json({ error: "Bond not found" });
    }
    const documents = await storage.getBondDocuments(id, req.user!.id);
    res.json({ bond, documents });
  } catch (error) {
    console.error("Get bond error:", error);
    res.status(500).json({ error: "Failed to load bond" });
  }
});
```

#### `POST /api/bonds/:id/documents` (upload)

```ts
app.post(
  "/api/bonds/:id/documents",
  authMiddleware,
  upload.single("file"),
  async (req: AuthRequest, res) => {
    try {
      const bondId = Number(req.params.id);
      const bond = await storage.getBond(bondId);
      if (!bond || bond.ownerId !== req.user!.id) {
        return res.status(404).json({ error: "Bond not found" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "File is required" });
      }

      const kind = req.body.kind === "template" ? "template" : "supporting";
      const description =
        typeof req.body.description === "string" ? req.body.description : undefined;

      const storagePath = req.file.path;

      const docPayload: InsertBondDocument = {
        bondId,
        ownerId: req.user!.id,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        storagePath,
        kind,
        description,
      };

      let doc = await storage.createBondDocument(docPayload);

      // Optional AI summarization & tagging
      try {
        const ai = await summarizeBondDocumentFromFile(doc.storagePath, doc.mimeType);
        if (ai) {
          doc = await storage.updateBondDocumentAI(doc.id, ai.summary, ai.tags);
        }
      } catch (err) {
        console.error("Bond doc AI summarization failed:", err);
      }

      res.json(doc);
    } catch (error) {
      console.error("Upload bond document error:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  }
);
```

You can also add `GET /api/bond-documents/search` if you want global search.

#### AI drafting endpoints

```ts
app.post("/api/bonds/:id/ai-draft", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const bond = await storage.getBond(id);
    if (!bond || bond.ownerId !== req.user!.id) {
      return res.status(404).json({ error: "Bond not found" });
    }

    const { purpose, style } = req.body ?? {};
    const draft = await generateBondDraft(bond, { purpose, style });
    res.json({ draft });
  } catch (error) {
    console.error("Bond AI draft error:", error);
    res.status(500).json({ error: "Failed to generate bond draft" });
  }
});

app.post("/api/bonds/:id/ai-edit", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const bond = await storage.getBond(id);
    if (!bond || bond.ownerId !== req.user!.id) {
      return res.status(404).json({ error: "Bond not found" });
    }

    const { existingDraft, instructions } = req.body ?? {};
    if (!existingDraft || typeof existingDraft !== "string") {
      return res.status(400).json({ error: "existingDraft is required" });
    }

    const draft = await editBondDraft(bond, existingDraft, instructions ?? "");
    res.json({ draft });
  } catch (error) {
    console.error("Bond AI edit error:", error);
    res.status(500).json({ error: "Failed to edit bond draft" });
  }
});
```

---

## 4. Frontend wiring

### 4.1 Route (`client/src/App.tsx`)

Import and add a route:

```ts
import BondsPage from "@/pages/bonds";
```

Inside your `<Switch>`:

```tsx
<Route path="/bonds">
  <AuthedLayout>
    <BondsPage />
  </AuthedLayout>
</Route>
```

(Ensure this matches your current router layout.)

### 4.2 Sidebar nav (`client/src/components/app-sidebar.tsx`)

Add a nav item in the main menu:

```ts
{
  title: "Bonds",
  icon: Package, // or another icon
  href: "/bonds",
  testId: "nav-bonds",
}
```

Place it near other analytics/investor items.

---

## 5. Dependencies (`package.json`)

Add:

```jsonc
"dependencies": {
  // ...
  "multer": "^1.4.5-lts.1",
  "pdf-parse": "^1.1.1",
  "mammoth": "^1.6.0"
}
```

Then run:

```bash
npm install
```

---

Once all of the above is wired:

1. Your `Bonds` page will allow only **real data** entry (CUSIP, ISIN, etc.).
2. Documents attached to bonds are parsed from real PDF/DOCX bytes.
3. AI summaries and tags are derived **only** from actual document text.
4. Draft generation/editing uses the real bond fields and explicit instructions you provide.

