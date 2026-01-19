# BondAI Platform - Complete Production-Ready System

**🎉 Fully Integrated Compliance & Web3 Bond Trading Platform**

[![Status](https://img.shields.io/badge/status-production--ready-green)]()
[![Compliance](https://img.shields.io/badge/compliance-integrated-blue)]()
[![Web3](https://img.shields.io/badge/web3-enabled-purple)]()
[![License](https://img.shields.io/badge/license-MIT-orange)]()

---

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/ocean824/BONDAI-MANUS-UPDATE.git
cd BONDAI-MANUS-UPDATE

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
pnpm db:migrate

# Start development server
docker-compose up -d  # Start PostgreSQL, Redis
pnpm dev              # Start backend
cd client && pnpm dev # Start frontend
```

**Access:** http://localhost:5173

---

## 📋 What's New in This Version

### ✅ Complete Compliance Integration
- **KYC/AML** - Identity verification (Persona, Onfido, Jumio, Sumsub)
- **Accredited Investor** - Income/net worth verification (Parallel Markets)
- **Tax Reporting** - W-9 collection & 1099 generation (Tax1099, Stripe Tax)
- **Terms & Privacy** - GDPR/CCPA compliant data management
- **Fraud Detection** - Suspicious activity monitoring

### ✅ Web3 Integration
- **BAI Token** - Native ERC-20 cryptocurrency (1B supply)
- **Staking Vault** - Token-gating for premium features
- **Bond NFTs** - ERC-721 tokenization
- **On-Chain Auctions** - Transparent blockchain-based bidding

### ✅ Production Infrastructure
- **Job Queue** - Bull/Redis for async processing
- **Caching** - Redis caching layer
- **Error Handling** - Centralized error management
- **Input Validation** - Zod schemas
- **Rate Limiting** - Per-user and per-API-key limits

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **README.md** (this file) | Quick start and overview |
| **README_ORIGINAL.md** | Original detailed technical documentation |
| **README_COMPLETE.md** | Comprehensive platform guide (100+ pages) |
| **COMPLIANCE_AUDIT.md** | Regulatory requirements and implementation |
| **WEB3_INTEGRATION_GUIDE.md** | Blockchain deployment guide |
| **FINAL_AUDIT_REPORT.md** | Complete audit and recommendations |

---

## 🎯 Key Features

### Core Trading
- ✅ Bond management with AI extraction
- ✅ Dutch auction system with WebSocket
- ✅ Secondary market trading
- ✅ Automatic investor distributions
- ✅ Risk scoring with Monte Carlo simulations

### Compliance (NEW)
- ✅ KYC/AML verification
- ✅ Accredited investor verification
- ✅ W-9 tax form collection (encrypted)
- ✅ 1099 form generation and IRS filing
- ✅ Terms of Service acceptance tracking
- ✅ Privacy Policy compliance (GDPR/CCPA)
- ✅ Data access, deletion, portability
- ✅ Suspicious activity reporting (SAR)
- ✅ Comprehensive audit logging

### Web3 (NEW)
- ✅ BAI token (ERC-20) with vesting
- ✅ Token-gating (1,000 BAI for auctions)
- ✅ Bond NFTs (ERC-721)
- ✅ On-chain auction registry
- ✅ Multi-chain support (Polygon, Ethereum)
- ✅ Wallet integration (MetaMask, WalletConnect)

### Automation (NEW)
- ✅ Webhook system (n8n-level)
- ✅ API key management
- ✅ Event bus (Redis Pub/Sub)
- ✅ Job queue processing
- ✅ Cross-platform integration

---

## ⚙️ Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bondai

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI
OPENAI_API_KEY=sk-...
```

### Optional Compliance Providers

```bash
# KYC/AML (choose one)
KYC_PROVIDER=persona  # or onfido, jumio, sumsub
KYC_API_KEY=your_api_key
PERSONA_TEMPLATE_ID=your_template_id

# Accredited Investor (choose one)
AI_PROVIDER=parallel_markets  # or verifyinvestor, north_capital
AI_API_KEY=your_api_key

# Tax Reporting (choose one)
TAX_PROVIDER=tax1099  # or stripe_tax, taxbit
TAX_API_KEY=your_api_key
TAX_ENCRYPTION_KEY=your_32_byte_hex_key
```

### Optional Web3 Configuration

```bash
# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

# Deployed Contracts (after deployment)
BAI_TOKEN_ADDRESS=0x...
STAKING_VAULT_ADDRESS=0x...
BOND_NFT_ADDRESS=0x...
AUCTION_REGISTRY_ADDRESS=0x...
```

---

## 🛡️ Compliance Integration

### Status: ✅ READY TO ACTIVATE

All compliance infrastructure is **fully implemented**. Simply add API keys to activate:

#### 1. KYC/AML Verification

**Supported Providers:**
- Persona (Recommended) - https://withpersona.com
- Onfido - https://onfido.com
- Jumio - https://www.jumio.com
- Sumsub - https://sumsub.com

**Features:**
- Identity document verification
- PEP screening
- Sanctions list checking (OFAC)
- Risk scoring

**Setup:**
1. Sign up with provider
2. Get API key
3. Add to `.env`:
```bash
KYC_PROVIDER=persona
KYC_API_KEY=your_key
PERSONA_TEMPLATE_ID=your_template
```

#### 2. Accredited Investor Verification

**Supported Providers:**
- Parallel Markets (Recommended) - https://parallelmarkets.com
- VerifyInvestor - https://verifyinvestor.com

**Setup:**
```bash
AI_PROVIDER=parallel_markets
AI_API_KEY=your_key
```

#### 3. Tax Reporting

**Supported Providers:**
- Tax1099 (Recommended) - https://www.tax1099.com
- Stripe Tax - https://stripe.com/tax

**Setup:**
```bash
TAX_PROVIDER=tax1099
TAX_API_KEY=your_key
TAX_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

---

## 🌐 Web3 Integration

### BAI Token

**Tokenomics:**
- Total Supply: 1,000,000,000 BAI
- 40% Platform Treasury (4-year vesting)
- 25% Investor Rewards
- 20% Team & Advisors (3-year vesting)
- 10% Liquidity Pools
- 5% Initial Airdrop

**Token-Gating:**
- Auction participation: 1,000 BAI
- Bond discount (10% off): 5,000 BAI
- Premium analytics: 10,000 BAI
- Distribution priority: 25,000 BAI

### Smart Contract Deployment

```bash
# Deploy to Mumbai testnet
npx hardhat run scripts/deploy.ts --network polygonMumbai

# Verify contracts
npx hardhat verify --network polygonMumbai <CONTRACT_ADDRESS>

# Update .env with addresses
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (React + Web3)                     │
├─────────────────────────────────────────────────────────────┤
│  - React 18 + TypeScript + TailwindCSS                       │
│  - Web3: wagmi + viem + RainbowKit                           │
│  - State: React Query                                        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS/WSS
┌────────────────────────┴────────────────────────────────────┐
│                API Gateway (Express.js)                      │
├─────────────────────────────────────────────────────────────┤
│  - Authentication (JWT)                                      │
│  - Authorization (RBAC)                                      │
│  - Rate Limiting (Redis)                                     │
│  - Input Validation (Zod)                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                   Business Services                          │
├─────────────────────────────────────────────────────────────┤
│  Core: bond, auction, trade, distribution, underwriting      │
│  Compliance: kyc, accreditedInvestor, taxReporting, terms   │
│  Web3: web3, tokenGate, nft                                  │
│  Infrastructure: queue, cache, webhook                       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│              Data Layer (PostgreSQL + Redis)                 │
├─────────────────────────────────────────────────────────────┤
│  - PostgreSQL: 34 tables (22 core + 12 Web3)                │
│  - Redis: Cache + Job Queue + Pub/Sub                       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│            External Services & Blockchain                    │
├─────────────────────────────────────────────────────────────┤
│  - Stripe (payments)                                         │
│  - OpenAI (AI extraction)                                    │
│  - KYC/AML providers                                         │
│  - Tax reporting providers                                   │
│  - Polygon blockchain                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment

### Docker Deployment (Recommended)

```bash
# Build and start
docker-compose up -d

# Check health
curl http://localhost:3000/health
```

### Manual Deployment

```bash
# Build frontend
cd client && pnpm build

# Build backend
pnpm build

# Start production server
NODE_ENV=production pnpm start
```

---

## 🧪 Testing

```bash
# All tests
pnpm test

# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration

# Smart contract tests
npx hardhat test

# Coverage
pnpm test:coverage
```

---

## 📖 API Documentation

### Authentication
```http
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
```

### Compliance
```http
# KYC
POST /api/kyc/start
GET /api/kyc/status

# Accredited Investor
POST /api/accredited-investor/start
GET /api/accredited-investor/status

# Tax
POST /api/tax/w9
GET /api/tax/documents

# Terms
POST /api/terms/accept
GET /api/terms/status

# Privacy
POST /api/privacy/request
GET /api/privacy/requests
```

### Bonds & Trading
```http
GET /api/bonds
POST /api/bonds
GET /api/auctions
POST /api/auctions/:id/bids
GET /api/investor/holdings
```

### Web3
```http
POST /api/wallet/link
GET /api/wallet/balance
POST /api/nft/mint
```

---

## 🔐 Security

- ✅ JWT authentication with 24-hour expiration
- ✅ bcrypt password hashing (10 rounds)
- ✅ Role-based access control (RBAC)
- ✅ Rate limiting (100 req/15min per user)
- ✅ Input validation (Zod schemas)
- ✅ SQL injection prevention (Drizzle ORM)
- ✅ XSS prevention (CSP headers)
- ✅ HTTPS only (TLS 1.3)
- ✅ Encrypted tax IDs (AES-256-GCM)
- ✅ OpenZeppelin smart contract patterns

---

## 📞 Support

- **Documentation:** See `/docs` directory
- **Issues:** https://github.com/ocean824/BONDAI-MANUS-UPDATE/issues
- **Email:** support@bondai.com
- **Privacy:** privacy@bondai.com
- **Legal:** legal@bondai.com

---

## 🎉 Status

**✅ PRODUCTION-READY**

- ✅ Core platform (original)
- ✅ Compliance integration (new)
- ✅ Web3 integration (new)
- ✅ Production infrastructure (new)
- ✅ Comprehensive documentation (new)

**⚠️ Before Public Launch:**
1. Add compliance provider API keys
2. Deploy smart contracts to mainnet
3. Complete security audit
4. Legal consultation
5. Penetration testing

---

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ by the BondAI Team**

**Repository:** https://github.com/ocean824/BONDAI-MANUS-UPDATE

For detailed technical documentation, see **README_ORIGINAL.md** and **README_COMPLETE.md**.
