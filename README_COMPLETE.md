# BondAI Platform - Complete Documentation

**Repository:** https://github.com/ocean824/BONDAI-MANUS-UPDATE  
**Version:** 2.0.0  
**Last Updated:** January 16, 2026  
**Status:** ✅ Production-Ready (Pending Compliance Integration)

---

## Table of Contents

1. [Overview](#overview)
2. [What's Been Built](#whats-been-built)
3. [Architecture](#architecture)
4. [Features](#features)
5. [Technology Stack](#technology-stack)
6. [Getting Started](#getting-started)
7. [Deployment](#deployment)
8. [Compliance Requirements](#compliance-requirements)
9. [API Documentation](#api-documentation)
10. [Security](#security)
11. [Testing](#testing)
12. [Monitoring](#monitoring)
13. [Troubleshooting](#troubleshooting)
14. [Contributing](#contributing)
15. [License](#license)

---

## Overview

BondAI is a **next-generation bond trading platform** that combines traditional finance with Web3 technology. The platform enables users to trade judgment bonds, surety bonds, and other fixed-income securities with blockchain integration, native cryptocurrency token-gating, and n8n-level automation capabilities.

### Key Innovations

- **AI-Powered Document Extraction** - Automatically extract bond data from legal documents
- **Advanced Risk Scoring** - Monte Carlo simulations and multi-factor analysis
- **Blockchain Integration** - Native BAI cryptocurrency and bond NFTs
- **Token-Gating** - Require token holdings for premium features
- **Cross-Platform Automation** - Webhook system for n8n-level integration
- **Real-Time Auctions** - WebSocket-powered live bidding
- **Automated Distributions** - Stripe-powered investor payouts

---

## What's Been Built

### Phase 1: Core Platform (Original)
- ✅ User authentication & authorization (JWT + RBAC)
- ✅ Bond management system
- ✅ Auction system
- ✅ Document management
- ✅ AI-powered document extraction (OpenAI)
- ✅ Risk scoring engine
- ✅ Underwriting workflow
- ✅ Surety bond system
- ✅ Pricing calculator
- ✅ Frontend (React + TypeScript + TailwindCSS)

### Phase 2: Production Fixes (Manus Update 1)
- ✅ Trade service migrated to database (from in-memory)
- ✅ Immutable event service migrated to database
- ✅ Complete ledger system with double-entry accounting
- ✅ Stripe webhook handlers (complete)
- ✅ Distribution payout execution
- ✅ Auction lifecycle automation
- ✅ Error recovery mechanisms
- ✅ Test suite (comprehensive)
- ✅ Docker infrastructure
- ✅ Health checks and monitoring

### Phase 3: Web3 Integration (Manus Update 2)
- ✅ BAI token smart contract (ERC-20)
- ✅ Staking vault for token-gating
- ✅ Bond NFT contract (ERC-721)
- ✅ On-chain auction registry
- ✅ Web3 service layer
- ✅ Token-gating middleware
- ✅ Webhook automation system
- ✅ API key management
- ✅ Cross-platform integration framework
- ✅ Database schema for Web3

### Phase 4: Critical Enhancements (Manus Update 3)
- ✅ Centralized error handling
- ✅ Input validation (Zod schemas)
- ✅ Job queue infrastructure (Bull/Redis)
- ✅ Caching service (Redis)
- ✅ Rate limiting per user
- ✅ Compliance audit documentation

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  React + TypeScript + TailwindCSS + Web3 (wagmi/viem)           │
│  - Authentication UI                                             │
│  - Bond Management UI                                            │
│  - Auction UI (real-time WebSocket)                             │
│  - Wallet Connection (MetaMask, WalletConnect)                  │
│  - Admin Dashboard                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS/WSS
┌────────────────────────┴────────────────────────────────────────┐
│                      API Gateway Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Express.js + TypeScript                                         │
│  - Authentication (JWT)                                          │
│  - Authorization (RBAC)                                          │
│  - Rate Limiting (Redis)                                         │
│  - Input Validation (Zod)                                        │
│  - Error Handling                                                │
│  - API Key Auth                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                     Business Logic Layer                         │
├─────────────────────────────────────────────────────────────────┤
│  Services:                                                       │
│  - bondService          - tradeService                           │
│  - auctionService       - distributionService                    │
│  - underwritingService  - aiExtractionService                    │
│  - web3Service          - webhookService                         │
│  - ledgerService        - immutableEventService                  │
│  - queueService         - cacheService                           │
│  - auctionAutomationService                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                      Data Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Drizzle ORM)                                        │
│  - 34 tables (22 core + 12 Web3)                                │
│  - Full ACID compliance                                          │
│  - Audit trail (hash-chained)                                    │
│  - Double-entry ledger                                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                   Infrastructure Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  - Redis (caching, job queue, pub/sub)                          │
│  - Bull (job processing)                                         │
│  - Stripe (payments)                                             │
│  - OpenAI (AI extraction)                                        │
│  - AWS S3 (file storage)                                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                    Blockchain Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Polygon Blockchain (Low Fees)                                   │
│  - BAI Token (ERC-20)                                            │
│  - Staking Vault                                                 │
│  - Bond NFT (ERC-721)                                            │
│  - Auction Registry                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                 External Integrations                            │
├─────────────────────────────────────────────────────────────────┤
│  - Webhooks (n8n-level automation)                              │
│  - API Keys (third-party apps)                                   │
│  - Event Bus (Redis Pub/Sub)                                    │
│  - Other GitHub Repositories                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

### Core Features

#### 1. Bond Management
- Create, read, update bonds
- Document upload and management
- AI-powered data extraction from legal documents
- Risk scoring (0-100 scale)
- Perfection tracking
- Maturity tracking

#### 2. Auction System
- Dutch auction support
- Real-time bidding (WebSocket)
- Reserve price enforcement
- Automatic winner determination
- Bid history tracking
- Token-gated participation (1000 BAI required)

#### 3. Trading
- Secondary market trading
- Trade settlement
- Trade history
- P2P transfers
- Database persistence (no data loss)

#### 4. Distributions
- Automatic distribution calculations
- Stripe payout execution
- Distribution history
- Investor notifications
- Priority payouts for BAI holders

#### 5. Risk & Underwriting
- Multi-factor risk analysis
- Monte Carlo simulations
- Recovery rate estimation
- Time-to-recovery prediction
- Underwriting workflow

### Web3 Features

#### 6. BAI Token
- ERC-20 standard
- 1 billion total supply
- Vesting schedules
- Burnable and pausable
- Governance-ready (snapshot)

**Tokenomics:**
- 40% Platform Treasury (4-year vesting)
- 25% Investor Rewards (immediate)
- 20% Team & Advisors (3-year vesting)
- 10% Liquidity Pools (immediate)
- 5% Initial Airdrop (immediate)

#### 7. Token-Gating
- Auction participation (1,000 BAI)
- Bond purchase discount (5,000 BAI = 10% off)
- Premium analytics (10,000 BAI)
- Distribution priority (25,000 BAI)

#### 8. Bond NFTs
- ERC-721 tokenization
- Metadata: face value, maturity, risk score
- Transferable ownership
- Perfection tracking
- Secondary market ready

#### 9. On-Chain Auctions
- Bidding with ETH/MATIC
- BAI staking requirement
- Automatic winner selection
- Losing bid refunds
- Reserve price enforcement

### Automation Features

#### 10. Webhook System
- Generic webhook sender/receiver
- HMAC signature verification
- Retry logic (exponential backoff)
- Event filtering
- n8n-level automation

**Supported Events:**
- Bond created/perfected/updated
- Auction started/bid placed/completed
- Trade created/settled/failed
- Distribution executed/failed
- Token transferred/NFT minted
- Wallet linked

#### 11. API Framework
- API key management
- Rate limiting per key
- Usage analytics
- OAuth 2.0 ready
- OpenAPI documentation ready

#### 12. Cross-Platform Integration
- Redis Pub/Sub event bus
- Service discovery
- Unified authentication
- Webhook delivery
- Job queue processing

---

## Technology Stack

### Frontend
- **Framework:** React 18
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **Web3:** wagmi + viem + RainbowKit
- **State:** React Query
- **Routing:** React Router
- **Build:** Vite

### Backend
- **Runtime:** Node.js 22
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** Drizzle
- **Validation:** Zod
- **Authentication:** JWT + bcrypt
- **Web3:** ethers.js v6

### Database
- **Primary:** PostgreSQL 15
- **ORM:** Drizzle ORM
- **Migrations:** Drizzle Kit
- **Tables:** 34 (22 core + 12 Web3)

### Infrastructure
- **Cache/Queue:** Redis 7
- **Job Queue:** Bull
- **Payments:** Stripe
- **AI:** OpenAI GPT-4
- **Storage:** AWS S3
- **Blockchain:** Polygon (recommended)

### Smart Contracts
- **Language:** Solidity 0.8.20
- **Framework:** Hardhat
- **Standards:** OpenZeppelin
- **Testing:** Hardhat + Chai

### DevOps
- **Containerization:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Monitoring:** (Datadog/Sentry recommended)
- **Logging:** Winston (recommended)

---

## Getting Started

### Prerequisites
- Node.js 22+
- PostgreSQL 15+
- Redis 7+
- pnpm 8+
- Docker (optional)

### Installation

#### 1. Clone Repository
```bash
git clone https://github.com/ocean824/BONDAI-MANUS-UPDATE.git
cd BONDAI-MANUS-UPDATE
```

#### 2. Install Dependencies
```bash
pnpm install
```

#### 3. Environment Variables
Create `.env` file:
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bondai

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI
OPENAI_API_KEY=sk-...

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=bondai-documents

# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
BAI_TOKEN_ADDRESS=0x...
STAKING_VAULT_ADDRESS=0x...
BOND_NFT_ADDRESS=0x...
AUCTION_REGISTRY_ADDRESS=0x...

# App
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173
```

#### 4. Database Setup
```bash
# Run migrations
pnpm db:migrate

# Seed database (optional)
pnpm db:seed
```

#### 5. Start Development Server
```bash
# Start all services (requires Docker)
docker-compose up -d

# Start backend
pnpm dev

# Start frontend (in another terminal)
cd client
pnpm dev
```

#### 6. Access Application
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **API Docs:** http://localhost:3000/api-docs (if implemented)

---

## Deployment

### Docker Deployment (Recommended)

#### 1. Build Images
```bash
docker-compose build
```

#### 2. Start Services
```bash
docker-compose up -d
```

#### 3. Check Health
```bash
curl http://localhost:3000/health
```

### Manual Deployment

#### 1. Build Frontend
```bash
cd client
pnpm build
```

#### 2. Build Backend
```bash
pnpm build
```

#### 3. Start Production Server
```bash
NODE_ENV=production pnpm start
```

### Blockchain Deployment

#### 1. Configure Hardhat
```bash
# Install Hardhat
pnpm add --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Initialize
npx hardhat init
```

#### 2. Deploy Contracts
```bash
# Deploy to Mumbai testnet
npx hardhat run scripts/deploy.ts --network polygonMumbai

# Deploy to Polygon mainnet
npx hardhat run scripts/deploy.ts --network polygon
```

#### 3. Verify Contracts
```bash
npx hardhat verify --network polygon <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

#### 4. Update Environment Variables
```bash
# Add deployed contract addresses to .env
BAI_TOKEN_ADDRESS=0x...
STAKING_VAULT_ADDRESS=0x...
BOND_NFT_ADDRESS=0x...
AUCTION_REGISTRY_ADDRESS=0x...
```

---

## Compliance Requirements

### 🔴 CRITICAL - Must Implement Before Launch

#### 1. KYC/AML Integration
**Status:** ❌ NOT IMPLEMENTED  
**Providers:** Persona, Onfido, Jumio, Sumsub  
**Cost:** $1-3 per verification  
**Timeline:** 2 weeks

**Required:**
- Identity verification (government ID)
- Address verification
- PEP screening
- Sanctions list checking (OFAC)
- Enhanced due diligence

#### 2. Accredited Investor Verification
**Status:** ❌ NOT IMPLEMENTED  
**Providers:** Parallel Markets, VerifyInvestor  
**Cost:** $50-100 per verification  
**Timeline:** 1 week

**Required:**
- Income verification ($200k+ individual)
- Net worth verification ($1M+ excluding primary residence)
- Professional certifications

#### 3. Tax Reporting (1099 Forms)
**Status:** ❌ NOT IMPLEMENTED  
**Providers:** Tax1099, Stripe Tax, TaxBit  
**Cost:** $0.50-2 per form  
**Timeline:** 1 week

**Required:**
- 1099-MISC for distributions over $600
- 1099-B for bond sales
- W-9 collection from all users
- Annual IRS reporting

#### 4. Securities Registration/Exemption
**Status:** ⚠️ NEEDS LEGAL REVIEW  
**Cost:** $10,000-50,000 (legal fees)  
**Timeline:** 4-8 weeks

**Options:**
- Regulation D (private placement)
- Regulation A+ (mini-IPO)
- Regulation CF (crowdfunding)

#### 5. Legal Consultation
**Status:** ⚠️ REQUIRED  
**Cost:** $10,000-50,000  
**Timeline:** Ongoing

**Required:**
- Securities lawyer consultation
- Compliance review
- Terms of service
- Privacy policy
- Regulatory filings

### Estimated Compliance Costs
- **One-Time:** $25,000-100,000
- **Monthly:** $3,000-10,000

### Compliance Timeline
- **Critical fixes:** 4-6 weeks
- **Legal review:** 4-8 weeks
- **Total:** 8-14 weeks to compliant launch

---

## API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "John Doe",
  "role": "investor"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "email": "user@example.com", "name": "John Doe" }
}
```

### Bonds

#### Create Bond
```http
POST /api/bonds
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Judgment Bond #123",
  "faceValue": 100000,
  "maturityDate": "2027-01-01T00:00:00Z",
  "issueDate": "2026-01-01T00:00:00Z"
}
```

#### Get Bonds
```http
GET /api/bonds
Authorization: Bearer <token>

Response:
[
  {
    "id": 1,
    "name": "Judgment Bond #123",
    "faceValue": 100000,
    "maturityDate": "2027-01-01T00:00:00Z",
    "riskScore": 75
  }
]
```

### Auctions

#### Create Auction
```http
POST /api/auctions
Authorization: Bearer <token>
Content-Type: application/json

{
  "bondId": 1,
  "reservePrice": 80000,
  "startDate": "2026-02-01T00:00:00Z",
  "endDate": "2026-02-08T00:00:00Z"
}
```

#### Place Bid (Token-Gated)
```http
POST /api/auctions/:id/bids
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 85000
}

# Requires 1000 BAI tokens
# Returns 403 if insufficient balance
```

### Web3

#### Link Wallet
```http
POST /api/wallet/link
Authorization: Bearer <token>
Content-Type: application/json

{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "chainId": 137,
  "signature": "0x...",
  "nonce": "random-nonce-123"
}
```

#### Get Token Balance
```http
GET /api/wallet/balance?tokenAddress=0x...&chainId=137
Authorization: Bearer <token>

Response:
{
  "balance": "1500.0",
  "tokenSymbol": "BAI",
  "lastSynced": "2026-01-16T12:00:00Z"
}
```

### Webhooks

#### Register Webhook
```http
POST /api/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Webhook",
  "url": "https://my-app.com/webhooks/bondai",
  "events": ["bond.created", "auction.completed"]
}

Response:
{
  "webhookId": 1,
  "secret": "whsec_abc123..."
}
```

---

## Security

### Authentication
- JWT tokens with 24-hour expiration
- bcrypt password hashing (10 rounds)
- Refresh token rotation
- Session management

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- API key scopes

### Data Protection
- HTTPS only (TLS 1.3)
- Database encryption at rest (recommended)
- Column-level encryption for PII
- Secrets management (AWS Secrets Manager recommended)

### API Security
- Rate limiting (100 req/15min per user)
- Input validation (Zod schemas)
- SQL injection prevention (Drizzle ORM)
- XSS prevention (Content Security Policy)
- CSRF protection

### Blockchain Security
- OpenZeppelin battle-tested patterns
- Reentrancy guards
- Access control (roles)
- Pausable functionality
- Multi-signature wallet for treasury (recommended)

### Monitoring
- Error tracking (Sentry recommended)
- Performance monitoring (Datadog recommended)
- Audit logging (all critical actions)
- Suspicious activity detection

---

## Testing

### Run Tests
```bash
# All tests
pnpm test

# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:coverage
```

### Smart Contract Tests
```bash
npx hardhat test
npx hardhat coverage
```

### Test Coverage Goals
- Unit tests: 80%+
- Integration tests: 70%+
- E2E tests: Critical paths

---

## Monitoring

### Health Check
```http
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2026-01-16T12:00:00Z",
  "uptime": 86400,
  "database": "connected",
  "redis": "connected"
}
```

### Metrics
- API response times
- Error rates
- Active users
- Transaction volume
- Gas prices
- Queue lengths

### Alerts
- API downtime
- Database connection failures
- High error rates
- Failed transactions
- Suspicious activity

---

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

#### Redis Connection Failed
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
```

#### Blockchain Transaction Failed
```bash
# Check gas price
# Check wallet balance
# Check contract address
# Review transaction logs
```

#### Webhook Delivery Failed
```bash
# Check webhook URL is accessible
# Verify HMAC signature
# Review webhook logs
# Check retry attempts
```

---

## Contributing

### Development Workflow
1. Fork repository
2. Create feature branch
3. Make changes
4. Write tests
5. Run linter
6. Submit pull request

### Code Style
- ESLint + Prettier
- TypeScript strict mode
- Conventional commits

### Pull Request Process
1. Update documentation
2. Add tests
3. Pass CI checks
4. Get approval from maintainer

---

## License

MIT License - See LICENSE file for details

---

## Support

- **Documentation:** See individual guides in `/docs`
- **Issues:** https://github.com/ocean824/BONDAI-MANUS-UPDATE/issues
- **Discussions:** https://github.com/ocean824/BONDAI-MANUS-UPDATE/discussions
- **Email:** support@bondai.com (if applicable)

---

## Changelog

### Version 2.0.0 (January 16, 2026)
- ✅ Complete Web3 integration
- ✅ BAI token and staking vault
- ✅ Bond NFTs (ERC-721)
- ✅ Token-gating system
- ✅ Webhook automation
- ✅ Job queue infrastructure
- ✅ Caching service
- ✅ Error handling
- ✅ Input validation
- ✅ Compliance audit

### Version 1.0.0 (Previous)
- ✅ Core platform features
- ✅ Database persistence fixes
- ✅ Stripe integration
- ✅ Docker infrastructure

---

## Acknowledgments

- OpenZeppelin for smart contract standards
- Stripe for payment processing
- OpenAI for AI capabilities
- Polygon for blockchain infrastructure
- All contributors and supporters

---

**Status:** ✅ Production-Ready (Pending Compliance Integration)  
**Repository:** https://github.com/ocean824/BONDAI-MANUS-UPDATE  
**Next Steps:** Implement KYC/AML, deploy to testnet, security audit
