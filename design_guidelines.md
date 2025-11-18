# Design Guidelines: Judgment Bond AI Platform

## Design Approach

**System**: Shadcn UI + Tailwind CSS with inspiration from Linear's typography, Stripe's data clarity, and professional financial dashboards.

**Rationale**: This is a data-intensive financial/legal platform requiring professional credibility, information clarity, and operational efficiency. The design must convey trust while enabling rapid decision-making with complex financial data.

---

## Typography

**Font Families**:
- Primary: Inter (headers, UI elements, data labels)
- Monospace: JetBrains Mono (numerical data, case numbers, monetary values)

**Hierarchy**:
- Page Titles: text-3xl font-semibold
- Section Headers: text-xl font-semibold
- Card Titles: text-lg font-medium
- Body Text: text-sm font-normal
- Data Labels: text-xs font-medium uppercase tracking-wide text-muted-foreground
- Numerical Values: text-base font-mono font-semibold
- Large Metrics: text-4xl font-mono font-bold

---

## Layout System

**Spacing Units**: Tailwind units of 2, 4, 6, 8, 12, 16 (p-4, gap-6, mt-8, etc.)

**Container Strategy**:
- Dashboard layouts: max-w-7xl mx-auto px-6
- Content cards: p-6 with gap-4 internal spacing
- Dense data tables: p-4 with gap-2
- Form sections: max-w-2xl with p-6

**Grid Patterns**:
- Metrics Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
- Judgment Lists: Single column with dividers
- Bundle Tranches: grid-cols-1 lg:grid-cols-3 gap-6
- Dashboard Panels: Two-column split (70/30) for main content + sidebar

---

## Component Library

**Navigation**:
- Top navbar: Horizontal with logo left, navigation center, user menu right, border-b with subtle shadow
- Sidebar (for dashboard): Fixed left sidebar, w-64, with collapsible sections and active state indicators

**Cards**:
- Standard Card: Rounded borders (rounded-lg), subtle shadow (shadow-sm), border, white background
- Metric Card: Larger padding (p-8), centered large numbers, small labels above
- Judgment Card: Compact (p-4), status badge top-right, monetary values right-aligned in mono font
- Tranche Card: Border-l-4 with distinct accent (Senior=blue, Mezz=amber, Equity=green)

**Data Display**:
- Tables: Striped rows, sticky headers, right-aligned numerical columns, hover states
- Pricing Scenarios: Three-column comparison cards (Base/Optimistic/Stressed) with clear visual separation
- Metrics Dashboard: Large numerical displays with trend indicators, small supporting text

**Forms**:
- Input Fields: Standard Shadcn inputs with labels, helper text, inline validation
- File Upload: Drag-drop zone with dashed border, file icon, clear CTA text
- Multi-step Forms: Progress indicator at top, clear step labels

**Buttons**:
- Primary: Solid fill, medium size (px-4 py-2)
- Secondary: Outline style
- Destructive: Red accent for dangerous actions
- Ghost: Minimal for tertiary actions

**AI Chat Assistant**:
- Fixed bottom-right chat bubble trigger (size-14, rounded-full)
- Chat panel: Slide-up drawer or right sidebar, max-w-md
- Messages: Left-aligned (AI) vs right-aligned (user), distinct backgrounds
- Input: Bottom-fixed with send button

**Status Indicators**:
- Badges: Small, rounded-full, uppercase text-xs
- Confidence Scores: Progress bars or circular percentage indicators
- Bundle Status: Pill-shaped badges (Draft/Open/Closed)

**PDF Upload Zone**:
- Large dropzone (min-h-64) with dashed border
- Upload icon, "Drop PDF here or click to browse" text
- File preview cards after upload with remove option

**Investor Teaser Preview**:
- PDF viewer embed or thumbnail preview
- Download button prominently placed
- Metadata display (bundle name, date generated, page count)

---

## Dashboard-Specific Layouts

**Judgments Page**:
- Left: Filterable judgment list (scrollable)
- Right: Selected judgment detail panel with tabs (Details, Extraction Results, Pricing Scenarios)

**Bundle Builder Page**:
- Top: Bundle selector dropdown + Create Bundle button
- Left: Available judgments (searchable/filterable)
- Right: Three tranche columns (Senior/Mezz/Equity) with drag-drop enabled, totals at bottom of each

**Investor Dashboard**:
- Hero metrics row: 4 large metric cards (Total Face Value, Recommended Purchase, Judgment Count, Avg Recovery)
- Tranche breakdown: Three-column cards showing per-tranche metrics
- Chart section: Simple bar chart showing bundle composition (if appropriate)
- Recent activity table at bottom

**Pricing Interface**:
- Left: Input form (Target IRR, Discount Rate, Expected Recovery)
- Right: Live calculation display with three scenario cards updating in real-time
- "Calculate" button prominent
- Disclaimer text at bottom

---

## Images

**Hero Image**: Not applicable for this B2B dashboard application. No marketing hero needed.

**Iconography**: Use Lucide Icons throughout for consistency (Upload, DollarSign, FileText, TrendingUp, Shield, etc.)

**Empty States**: Custom illustrations for:
- "No judgments yet" (upload icon + text)
- "Create your first bundle" (folder icon + text)
- "No pricing scenarios calculated" (calculator icon + text)

---

## Animations

**Minimal Approach**:
- Subtle fade-ins for cards (opacity transitions)
- Smooth drawer/modal entry (transform + opacity)
- Loading spinners for AI extraction/pricing
- NO scroll animations, parallax, or decorative motion

---

## Professional Trust Elements

- Disclaimer footer on pricing pages: Small, clear, legal text
- Confidence scores always visible on AI extractions
- Audit trail indicators (Created date, Last modified)
- Data source labels ("AI Extracted" vs "User Verified")
- Clear loading states during AI processing with progress indication

---

## Accessibility

- High contrast ratios for all text
- Focus indicators on all interactive elements
- Keyboard navigation throughout
- Screen reader labels on data visualizations
- ARIA labels on icon-only buttons