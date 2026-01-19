# Judgment Bond AI Platform

## Overview
The Judgment Bond AI Platform is an AI-powered financial/legal technology application for judgment debt underwriting and bond packaging. It enables users to upload judgment documents, extract structured data using AI, generate multi-scenario pricing estimates, create investment bundles with tranche structures, manage bond instruments with AI-assisted document drafting, and access investor metrics dashboards. The platform's core purpose is to streamline the packaging of judgment debts into investable bonds, leveraging AI for efficiency and accuracy to tap into a new asset class for investors.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Design
The platform uses a React 18 frontend with Shadcn UI, an Express.js (TypeScript) backend, and a PostgreSQL database with Drizzle ORM. Authentication is JWT-based with role-based access control (Admin, Analyst, Investor). AI integration primarily uses OpenAI's GPT models for data extraction, document drafting, summarization, and conversational assistance, adhering to a "Real Data Only" policy.

### Key Features

*   **Judgment Extraction**: AI extracts structured data from legal judgment documents (PDF/DOCX).
*   **Pricing Engine**: Provides multi-scenario (base, optimistic, stressed) pricing estimates including discount rates, recovery, and IRR.
*   **Bundle & Tranche System**: Allows creation of investment bundles with judgment assignments and tranche designations (senior, mezz, equity).
*   **Underwriting System**: Multi-party judgment debt risk assessment, automated recovery calculations, and AI-generated narrative summaries.
*   **Bond Management System**: Comprehensive bond creation and management with AI extraction of bond data (score, risk tier) from documents, and AI-assisted document drafting.
*   **PDF Generation**: Automated creation of professional investor teaser PDFs for bundles.
*   **Trending Topics System**: An optional Python FastAPI microservice fetches and summarizes bond market news using AI, including risk level and sentiment analysis.
*   **Bond Exchange System**: An investor auction system for trading perfected bonds with 5-day auctions and reserve price bidding, enforced with a global investor gate.
*   **Investor Membership System**: Two-tiered Stripe-powered subscription system:
    - Standard Tier ($199/month): Access to Bond Exchange, view auctions, place bids, track bid history
    - Premium Tier ($299/month): All Standard features plus priority access, advanced analytics, exclusive auctions
    - Investors must have an active paid subscription to access Bond Exchange features
    - Stripe checkout integration with webhook-based subscription status updates
*   **Surety Bond Underwriting System**: A complete surety bond underwriting system with PIN-protected admin access, risk-based collateral calculations, and full lifecycle management for judgment bonds.
*   **Document Engine (Admin Only)**: Complete document generation system for every step of the bond lifecycle:
    - 7 Bond Process Steps: JUDGMENT_TO_BOND, PERFECTION, SURETY_UNDERWRITING, SURETY_ACTIVATION, EXCHANGE_LISTING, EXCHANGE_SALE, TRUST_ALLOCATION
    - 12 Document Types: Bond Term Sheet, Bond Instrument, Perfection Certificate, GIA, Collateral Agreement, Surety Trust Resolution, Underwriting Report, Exchange Offering Sheet, Investor Subscription, Trade Confirmation, Trust Board Minutes, Trust Allocation Resolution
    - PDFs generated dynamically using bond data from database
    - Documents tracked in bondProcessDocuments table with status workflow (DRAFT → FINAL → SIGNED → ARCHIVED)

### v3.0 Features (Manus AI Enhancements)

*   **Compliance Infrastructure**: 
    - KYC/AML Service with Persona, Onfido, Jumio, Sumsub integration support
    - Accredited Investor Verification (Parallel Markets, VerifyInvestor, North Capital)
    - Tax Reporting Service (W-9 forms, 1099 generation, Tax1099/Stripe Tax integration)
    - Terms & Privacy Service with GDPR/CCPA compliance
*   **Web3 & Blockchain Integration**:
    - BAI Token (ERC-20) smart contract with vesting
    - StakingVault for token-gating and auction participation
    - BondNFT (ERC-721) for tokenized bond representation
    - BondAuctionRegistry for on-chain bidding
*   **Double-Entry Ledger System**: Full accounting ledger with journal entries and postings
*   **Exchange Trade Settlement**: Complete trade lifecycle with Stripe payment processing
*   **Immutable Event Log**: Blockchain-style event chain for audit trail
*   **Auction Automation**: Automated auction lifecycle management
*   **Distribution Service**: Bond interest/principal distribution to investors
*   **Third-Party Integration Framework**: Adapter pattern for payment, banking, and custody providers

### Technical Implementations
*   **Frontend**: React 18, Vite, Shadcn UI (Radix UI + Tailwind CSS), TanStack Query, Wouter.
*   **Backend**: Express.js, TypeScript, RESTful API, JWT, Zod validation, Drizzle ORM.
*   **Database**: PostgreSQL (Neon serverless driver) with specific schemas for users, judgments, bundles, bonds, underwriting cases, and trending topics.
*   **AI Models**: OpenAI GPT-4o (extraction, chat, drafting, summarization), GPT-5 (bond extraction, drafting), GPT-4.1-mini (trending topic summarization).

## External Dependencies

### Third-Party Services
*   **Neon Database**: PostgreSQL serverless database.
*   **OpenAI (via Replit AI Integrations)**: For various AI functionalities.
*   **Stripe (via Replit Integrations)**: Payment processing for investor memberships with automatic schema sync.
*   **Replit Platform**: Development and deployment environment.
*   **FastAPI Python Service** (optional): Microservice for trending topics.

### Key NPM Packages
*   **Frontend**: `@tanstack/react-query`, `wouter`, `@radix-ui/*`, `tailwindcss`, `zod`, `lucide-react`, `react-hook-form`.
*   **Backend**: `drizzle-orm`, `@neondatabase/serverless`, `bcryptjs`, `jsonwebtoken`, `express`, `zod`, `pdfkit`, `stripe`, `stripe-replit-sync`.

### Key Python Packages (FastAPI Service)
*   `fastapi`, `uvicorn[standard]`, `openai`, `pydantic`.