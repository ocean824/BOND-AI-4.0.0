# Judgment Bond AI Platform

## Overview
The Judgment Bond AI Platform is a financial/legal technology application designed for AI-powered judgment debt underwriting and bond packaging for investors. It enables users to upload judgment documents, extract structured data using AI, generate multi-scenario pricing estimates, create investment bundles with tranche structures, manage bond instruments with AI-assisted document drafting, and access investor metrics dashboards. The platform aims to streamline the process of packaging judgment debts into investable bonds, leveraging AI for efficiency and accuracy.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with Vite.
- **UI Library**: Shadcn UI (Radix UI + Tailwind CSS).
- **Design System**: Custom, inspired by Linear and Stripe, using Inter font for UI and JetBrains Mono for financial data.
- **State Management**: TanStack Query for server state.
- **Routing**: Wouter.
- **Authentication**: Context-based with JWT.
- **Component Structure**: Pages for major views, reusable UI components, persistent AI chat assistant, role-based sidebar navigation.

### Backend Architecture
- **Framework**: Express.js with TypeScript.
- **API Design**: RESTful with standardized JSON.
- **Authentication**: JWT-based with bcrypt hashing.
- **Request Flow**: Express middleware for context, auth, and parsing.
- **Error Handling**: Centralized with typed error classes.
- **Validation**: Zod schemas.
- **Service Layer**: Business logic separated into modules (AI extraction, pricing, underwriting, assistant).
- **API Documentation**: OpenAPI specification.

### Database Architecture
- **ORM**: Drizzle ORM.
- **Database**: PostgreSQL (Neon serverless driver).
- **Schema Design**: Includes users (role-based), judgments, bundles (with tranche assignments), price estimates, bonds (with financial instrument details), bond documents (with AI summarization/tagging), chat sessions, recovery scores, trending topics (with AI summaries), underwriting cases and parties (multi-party risk assessment).
- **Migrations**: SQL-based via Drizzle Kit.
- **Seeding**: Admin user account only.

### Authentication & Authorization
- **Strategy**: JWT tokens (7-day expiration) stored in localStorage.
- **Password Security**: Bcrypt hashing.
- **User Roles**: Admin, Analyst, and Investor.
- **Admin Access**: Full privileges, universal data visibility, CRUD operations on all resources, separate token storage, and dedicated admin endpoints/panel. Admin bypasses all ownership verification checks.
- **Investor Access**: Limited to Bond Exchange features (overview, auctions, bidding). Cannot access underwriting, judgment management, or bundle operations.

### AI Integration
- **Provider**: OpenAI API (via Replit AI Integrations).
- **Model**: GPT-4o for extraction, chat, bond drafting, and document summarization.
- **Judgment Extraction**: Structured data extraction from legal judgment documents (PDF/DOCX) via drag-and-drop, populating form fields.
- **Bond Document Drafting**: AI-assisted generation of bond term sheets, indenture outlines, and summaries using real bond data.
- **Document Summarization**: Automatic summarization and tag extraction for uploaded bond documents.
- **AI Assistant**: Conversational interface.
- **Response Format**: JSON mode.
- **Confidence Scoring**: AI provides confidence ratings for extracted data.
- **"Real Data Only" Policy**: AI services exclusively use real data, prohibiting fabrication.

### Pricing Engine
- **Modeling**: Multi-scenario (base, optimistic, stressed) pricing.
- **Calculations**: Discount rate, expected recovery, recommended purchase price, target IRR.
- **Clamping Logic**: Recovery and discount percentages constrained (5-95%).
- **Scenario Variations**: Optimistic (+10% recovery, -5% discount), Stressed (-15% recovery, +10% discount).

### Bundle & Tranche System
- **Functionality**: Create named investment bundles, assign judgments with tranche designations (senior, mezz, equity), aggregate financial values, remove judgments.
- **Security**: Ownership verification for all bundle operations.

### Underwriting System
- **Functionality**: Multi-party judgment debt risk assessment with comprehensive underwriting checklist.
- **Recovery Rules**: Automated 50% recovery calculations for attached assets, vassalees' annual revenue, and risk management insurance coverage.
- **Multi-Party Analysis**: Computes collection estimates across multiple parties (debtors, guarantors, vassalees) with average collection percentages.
- **AI Narrative Generation**: GPT-4o generates plain-English summaries explaining underwriting metrics and risk assessment.
- **Database Tables**: `underwriting_cases` stores case details, metrics, and narratives; `underwriting_parties` stores individual party data with JSONB flexibility.
- **API Endpoints**:
  - `GET /api/underwriting/cases` - Fetch all underwriting cases (admin sees all, users see own)
  - `POST /api/underwriting/cases` - Create new case with parties, metrics, and AI narrative
- **Frontend**: Comprehensive form with real-time metrics preview, party management, qualitative notes, and saved cases view.
- **Security**: Ownership verification with admin override for universal access.

### Bond Management System
- **Functionality**: Create and manage bonds with comprehensive metadata (CUSIP, ISIN, coupon, maturity, etc.).
- **AI Bond Extraction**: GPT-5 extracts structured bond data from PDF/DOCX documents, including bondScore (0-100), riskTier (low/moderate/high), and 11+ bond fields. Auto-fills form with extracted data.
- **Bond Score Persistence**: AI-extracted bond scores and risk tiers persist in database during bond creation. Nullable columns support existing bonds without backfilling.
- **Score Update Endpoint**: PATCH /api/bonds/:id/score allows updating bond scores independently. Auto-derives risk tier from score if not provided (70+ = low, <40 = high, else moderate).
- **UI Score Badges**: Bond list displays color-coded badges showing score and risk tier (green=low, yellow=moderate, red=high). Shows "Not scored" for bonds without AI scores. Full dark mode support.
- **Validation**: Strict Zod schema validation ensures AI responses contain required fields (bondScore, riskTier enum) and valid numeric data. Returns 422 for validation failures, 503 for configuration errors.
- **Extraction Endpoint**: POST /api/bonds/extract-from-document accepts file uploads, validates with strict schema, returns structured data with warnings for low-confidence fields.
- **AI Document Drafting**: GPT-5 generates bond documents.
- **Document Upload**: Supports PDF and DOCX with text extraction, summarization, and tagging.
- **File Storage**: Multer-based, organized in `uploads/bond-documents`.
- **Security**: Ownership verification for all bond operations.

### PDF Generation
- **Investor Teaser Generation**: Automated professional PDF creation for bundles.
- **Content**: Bundle overview, executive summary, financial metrics, tranche breakdown, judgment portfolio, legal disclaimers.
- **Security**: Ownership verification.
- **Implementation**: PDFKit library.

### Trending Topics System
- **Python FastAPI Microservice**: Separate FastAPI service for fetching and summarizing bond market news.
- **Functionality**: Fetch trending topics from external sources, AI-powered summarization with GPT-4.1-mini, risk level and sentiment analysis.
- **Database Tables**: `trending_topics` stores news articles/topics with metadata, `trending_summaries` stores AI-generated summaries with bullet points, risk levels, and sentiment.
- **API Endpoints**: 
  - `GET /api/trending` - Fetch trending topics with summaries (authenticated users)
  - `POST /api/admin/trending/refresh` - Refresh trending data via FastAPI (admin only)
- **Integration**: Node.js Express backend communicates with Python FastAPI service via HTTP.
- **Configuration**: Optional feature activated via `FASTAPI_BASE_URL` and `FASTAPI_INTERNAL_TOKEN` environment variables.
- **Security**: Internal token authentication between services, admin-only refresh endpoint.

### Bond Exchange System
- **Functionality**: Investor auction system for trading perfected bonds with 5-day auctions and reserve price bidding.
- **Database Tables**: `auctions` stores auction details (status, start/end times, reserve price, winning bid); `auction_bids` stores individual bids with investor IDs and amounts. Additional bond columns: `isPerfected`, `perfectedAt`, `expectedPerfectedAt`, `currentAuctionId`.
- **Bond Perfection Workflow**: When a bond becomes legally perfected, admin triggers perfection which marks the bond as perfected and creates a 5-day auction with specified reserve price.
- **Auction Mechanics**: Auctions are ACTIVE when started, COMPLETED when reserve price is met by a bid, or EXPIRED when time runs out without meeting reserve. Reserve price bidding means the auction ends immediately when a bid meets or exceeds the reserve.
- **API Endpoints**:
  - `GET /api/investor/overview` - Aggregated bond totals by time period (7 days, 30 days, later)
  - `GET /api/investor/auctions` - List active auctions open for bidding
  - `GET /api/investor/auctions/:id` - Get auction details with highest bid
  - `POST /api/investor/auctions/:id/bids` - Place a bid on an auction (must exceed current highest by $1)
  - `GET /api/investor/my-bids` - List bids for the logged-in investor
  - `POST /api/admin/bonds/:id/perfect` - Admin endpoint to perfect a bond and create auction
  - `POST /api/admin/auctions/close-expired` - Admin endpoint to close expired auctions
- **Frontend Pages**: InvestorOverview (aggregate totals), InvestorExchange (auction table with bidding), InvestorMyBids (bid history).
- **Role-Based Navigation**: Sidebar shows Bond Exchange menu items only for admin and investor roles.
- **Security**: Investor auth middleware requires investor or admin role. Admin has full access to perfection and auction management endpoints.

## External Dependencies

### Third-Party Services
- **Neon Database**: PostgreSQL serverless database.
- **OpenAI (via Replit AI Integrations)**: GPT-5 access for judgment extraction and bond drafting, GPT-4.1-mini for trending topic summarization.
- **Replit Platform**: Development and deployment environment.
- **FastAPI Python Service** (optional): Internal microservice for trending topics aggregation and AI summarization.

### Key NPM Packages
- **Frontend**: `@tanstack/react-query`, `wouter`, `@radix-ui/*`, `tailwindcss`, `zod`, `lucide-react`, `react-hook-form`, `@hookform/resolvers`.
- **Backend**: `drizzle-orm`, `@neondatabase/serverless`, `bcryptjs`, `jsonwebtoken`, `express`, `zod`, `pdfkit`.
- **Development**: `vite`, `tsx`, `esbuild`, `drizzle-kit`.

### Key Python Packages (FastAPI Service)
- **Framework**: `fastapi`, `uvicorn[standard]`
- **AI Integration**: `openai` (for GPT-4.1-mini summarization)
- **Data Validation**: `pydantic`

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string.
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: OpenAI API base URL.
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API key.
- `SESSION_SECRET` or `JWT_SECRET`: Secret for JWT signing.
- `NODE_ENV`: Environment indicator.
- `FASTAPI_BASE_URL` (optional): Base URL for Python FastAPI trending service.
- `FASTAPI_INTERNAL_TOKEN` (optional): Authentication token for internal service communication.
- `OPENAI_API_KEY` (for Python service): OpenAI API key for trending topic summarization.