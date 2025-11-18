# Judgment Bond AI Platform

## Overview

The Judgment Bond AI Platform is a financial/legal technology application that enables AI-powered judgment debt underwriting and bond packaging for investors. The system allows users to upload judgment documents, automatically extract structured data using AI, generate multi-scenario pricing estimates, create investment bundles with tranche structures, and access comprehensive investor metrics dashboards.

The platform is built as a full-stack TypeScript application with a React frontend, Express backend, PostgreSQL database (via Drizzle ORM), and OpenAI integration for document extraction and conversational assistance.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with Vite as the build tool and development server
- **UI Library**: Shadcn UI components built on Radix UI primitives with Tailwind CSS
- **Design System**: Custom design guidelines inspired by Linear's typography, Stripe's data clarity, and professional financial dashboards. Uses Inter font for UI elements and JetBrains Mono for numerical/financial data
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Context-based auth provider with JWT token storage in localStorage
- **Component Structure**: 
  - Pages for major views (Dashboard, Judgments, Bundles, Investor Dashboard)
  - Reusable UI components in `/components/ui`
  - AI chat assistant as a persistent overlay component
  - Sidebar navigation with role-based menu items

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints with standardized JSON responses
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Request Flow**: Express middleware chain including request context (timing/logging), auth guards, and JSON parsing
- **Error Handling**: Centralized error middleware with typed error classes
- **Validation**: Zod schemas for request validation at API boundaries
- **Service Layer**: Business logic separated into service modules (AI extraction, pricing, assistant)
- **API Documentation**: OpenAPI specification (openapi.yml) with potential ReDoc integration

### Database Architecture
- **ORM**: Drizzle ORM for type-safe database queries
- **Database**: PostgreSQL (via Neon serverless driver) with WebSocket support
- **Schema Design**: 
  - Users with role-based access (admin, analyst)
  - Judgments with extracted fields and raw data storage
  - Bundles for grouping judgments into investment packages
  - Bundle-judgment many-to-many relationship with tranche assignments
  - Price estimates linked to judgments with scenario-based modeling
  - Chat sessions and messages for AI assistant conversations
  - Recovery scores for AI-based judgment assessment
- **Migrations**: SQL-based migrations in `/db/migrations` directory with Drizzle Kit tooling
- **Seeding**: Automated seed script creating admin user and sample data

### Authentication & Authorization
- **Strategy**: JWT tokens with 7-day expiration
- **Token Management**: Bearer token authentication via Authorization headers
- **Password Security**: Bcrypt hashing with salt rounds
- **Session Persistence**: Tokens stored in localStorage, validated on app load
- **Protected Routes**: Auth middleware applied to sensitive endpoints
- **User Roles**: Role field in user schema (admin, analyst) for potential future RBAC

### AI Integration
- **Provider**: OpenAI API (via Replit AI Integrations service)
- **Model**: GPT-5 for both extraction and chat capabilities
- **Document Extraction**: Structured data extraction from legal judgment documents with JSON output format
- **AI Assistant**: Conversational interface for user onboarding and guidance
- **Response Format**: JSON mode for extraction to ensure parseable output
- **Confidence Scoring**: AI provides confidence ratings for extracted data

### Pricing Engine
- **Multi-Scenario Modeling**: Generates base, optimistic, and stressed pricing scenarios
- **Financial Calculations**: 
  - Discount rate application
  - Expected recovery percentage calculations
  - Recommended purchase price determination
  - Target IRR considerations
- **Clamping Logic**: Ensures recovery and discount percentages stay within reasonable bounds (5-95%)
- **Scenario Variations**: Optimistic (+10% recovery, -5% discount), Stressed (-15% recovery, +10% discount)

### Bundle & Tranche System
- **Bundle Creation**: Users can create named investment bundles with descriptions
- **Judgment Assignment**: Add judgments to bundles with tranche designation (senior, mezz, equity)
- **Aggregation**: Bundles calculate total face value and recommended purchase amounts
- **Removal**: Support for removing judgments from bundles
- **Ownership Verification**: All bundle endpoints verify ownership to prevent unauthorized access (IDOR protection)

### PDF Generation
- **Investor Teaser Generation**: Automated creation of professional investor teaser PDFs for bundles
- **Endpoint**: GET /api/teaser/:bundleId (requires authentication and bundle ownership)
- **Content**: Bundle overview, executive summary with financial metrics, tranche breakdown table, judgment portfolio details, legal disclaimers
- **Security**: Ownership verification prevents unauthorized access to sensitive investor data
- **Implementation**: PDFKit library for PDF generation with proper stream handling
- **Download**: Client-side blob download with Authorization bearer token authentication

## External Dependencies

### Third-Party Services
- **Neon Database**: PostgreSQL serverless database with WebSocket connection pooling
- **OpenAI (via Replit AI Integrations)**: GPT-5 access for document extraction and conversational AI without requiring separate API key
- **Replit Platform**: Development and deployment environment with integrated database provisioning

### Key NPM Packages
- **Frontend**:
  - `@tanstack/react-query`: Server state management and caching
  - `wouter`: Lightweight routing library
  - `@radix-ui/*`: Headless UI component primitives
  - `tailwindcss`: Utility-first CSS framework
  - `zod`: Runtime type validation and schema parsing
  - `lucide-react`: Icon library
  - `react-hook-form`: Form state management
  - `@hookform/resolvers`: Zod integration for form validation

- **Backend**:
  - `drizzle-orm`: TypeScript ORM with PostgreSQL support
  - `@neondatabase/serverless`: Neon database driver with WebSocket support
  - `bcryptjs`: Password hashing
  - `jsonwebtoken`: JWT token generation and verification
  - `express`: Web server framework
  - `zod`: Request validation schemas
  - `pdfkit`: PDF generation library for investor teasers

- **Development**:
  - `vite`: Frontend build tool and dev server
  - `tsx`: TypeScript execution for server development
  - `esbuild`: Backend bundling for production
  - `drizzle-kit`: Database migration tooling

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required, provisioned by Replit)
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: OpenAI API base URL (Replit AI Integrations)
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API key (Replit AI Integrations)
- `SESSION_SECRET` or `JWT_SECRET`: Secret key for JWT signing (defaults to development value)
- `NODE_ENV`: Environment indicator (development/production)

### Build & Deployment
- **Development**: Vite dev server with HMR for frontend, tsx for backend hot reload
- **Build Process**: Vite builds frontend to `/dist/public`, esbuild bundles backend to `/dist`
- **Production**: Serves static frontend files from Express in production mode
- **Database Operations**: Drizzle Kit commands for schema push and migrations