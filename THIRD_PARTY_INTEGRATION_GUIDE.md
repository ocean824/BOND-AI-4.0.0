# Third-Party Integration Guide

**BondAI Platform - Remain a Platform, Not a Marketplace**

This guide explains how to integrate third-party services for compliance, banking, payment processing, custody, and escrow. BondAI is designed as a **platform** that works with YOUR chosen providers, not as a marketplace that locks you in.

---

## 🎯 Philosophy: Platform, Not Marketplace

### What This Means

**Platform Approach (BondAI):**
- ✅ You choose your own banks
- ✅ You choose your own payment processors
- ✅ You choose your own compliance providers
- ✅ You control the money flow
- ✅ You own the customer relationships
- ✅ Lower fees (no marketplace cut)

**Marketplace Approach (What We Avoid):**
- ❌ Locked into one payment processor
- ❌ Forced to use marketplace's bank
- ❌ Marketplace takes a cut of every transaction
- ❌ Limited customization
- ❌ Vendor lock-in

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    BondAI Platform (Your Code)               │
├─────────────────────────────────────────────────────────────┤
│  - Bond management                                           │
│  - Auction system                                            │
│  - User management                                           │
│  - Risk scoring                                              │
└────────────────────────┬────────────────────────────────────┘
                         │ Integration Framework
┌────────────────────────┴────────────────────────────────────┐
│              Integration Adapters (Plug & Play)              │
├─────────────────────────────────────────────────────────────┤
│  Payment    │  Banking    │  Compliance  │  Custody         │
│  - Stripe   │  - Plaid    │  - Persona   │  - Your         │
│  - PayPal   │  - Dwolla   │  - Onfido    │    Custodian    │
│  - Your Bank│  - Your Bank│  - Your KYC  │  - Third Party  │
└─────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│              Third-Party Services (Your Choice)              │
├─────────────────────────────────────────────────────────────┤
│  - Your bank's API                                           │
│  - Your compliance provider                                  │
│  - Your custodian                                            │
│  - Your escrow service                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Integration Types

### 1. Payment Processing

**Options:**
- **Stripe** (default, easiest)
- **PayPal** (for consumer payments)
- **Your Bank's API** (for direct bank integration)
- **Wire Transfer** (for large transactions)
- **ACH** (for recurring payments)

**When to Use Each:**
- Stripe: Small to medium transactions ($1-$100k)
- Wire Transfer: Large transactions ($100k+)
- ACH: Recurring distributions
- Direct Bank: When you have existing banking relationships

### 2. Banking Integration

**Options:**
- **Plaid** (bank account linking, balance checking)
- **Dwolla** (ACH transfers)
- **Your Bank's API** (wire transfers, direct integration)

**When to Use Each:**
- Plaid: Let users link their bank accounts
- Dwolla: ACH transfers for distributions
- Direct Bank: Wire transfers for large amounts

### 3. Compliance Services

**Options:**
- **KYC/AML:** Persona, Onfido, Jumio, Sumsub, or your provider
- **Accredited Investor:** Parallel Markets, VerifyInvestor, or your provider
- **Tax Reporting:** Tax1099, Stripe Tax, or your provider

**When to Use Each:**
- Use our integrated providers for quick setup
- Use your own provider if you have existing relationships
- Use multiple providers for redundancy

### 4. Custody & Escrow

**Options:**
- **Third-Party Custodian** (for bond custody)
- **Escrow Service** (for transaction escrow)
- **Your Own System** (if you're a registered custodian)

---

## 🔧 How to Integrate

### Step 1: Choose Your Providers

Make a list of providers for each category:

```
Payment Processing: [Stripe, Wire Transfer]
Banking: [Plaid, Your Bank]
KYC/AML: [Persona]
Accredited Investor: [Parallel Markets]
Tax Reporting: [Tax1099]
Custody: [Third-Party Custodian]
Escrow: [Third-Party Escrow]
```

### Step 2: Get API Keys

Sign up with each provider and get API keys:

**Payment (Stripe):**
- Sign up: https://stripe.com
- Get keys: Dashboard > Developers > API keys
- Add to `.env`: `STRIPE_SECRET_KEY=sk_...`

**Banking (Plaid):**
- Sign up: https://plaid.com
- Get keys: Dashboard > Team Settings > Keys
- Add to `.env`:
  ```
  PLAID_CLIENT_ID=your_client_id
  PLAID_SECRET=your_secret
  PLAID_ENV=sandbox  # or production
  ```

**Banking (Dwolla):**
- Sign up: https://www.dwolla.com
- Get keys: Dashboard > Applications
- Add to `.env`:
  ```
  DWOLLA_KEY=your_key
  DWOLLA_SECRET=your_secret
  DWOLLA_ENV=sandbox  # or production
  ```

**KYC/AML (Persona):**
- Sign up: https://withpersona.com
- Get keys: Dashboard > API Keys
- Add to `.env`:
  ```
  KYC_PROVIDER=persona
  KYC_API_KEY=your_api_key
  PERSONA_TEMPLATE_ID=your_template_id
  ```

**Accredited Investor (Parallel Markets):**
- Sign up: https://parallelmarkets.com
- Get keys: Dashboard > API
- Add to `.env`:
  ```
  AI_PROVIDER=parallel_markets
  AI_API_KEY=your_api_key
  ```

**Tax Reporting (Tax1099):**
- Sign up: https://www.tax1099.com
- Get keys: Dashboard > API
- Add to `.env`:
  ```
  TAX_PROVIDER=tax1099
  TAX_API_KEY=your_api_key
  TAX_ENCRYPTION_KEY=$(openssl rand -hex 32)
  ```

### Step 3: Configure Adapters

The platform automatically uses configured adapters. No code changes needed!

```typescript
// The platform automatically detects and uses configured providers
import { getPaymentProvider, getBankingProvider } from './integrations/IntegrationFramework';

// Use payment provider (automatically uses Stripe if configured)
const paymentProvider = getPaymentProvider();
await paymentProvider.createCharge({
  amount: 1000,
  currency: 'USD',
  customerId: 'cus_123',
  description: 'Bond purchase',
});

// Use banking provider (automatically uses Plaid if configured)
const bankingProvider = getBankingProvider();
const accounts = await bankingProvider.getBankAccounts(accessToken);
```

### Step 4: Test Integration

```bash
# Start server
pnpm dev

# Test health check
curl http://localhost:3000/api/integrations/health

# Response:
{
  "stripe": { "healthy": true, "message": "Stripe connection healthy" },
  "plaid": { "healthy": true, "message": "Plaid connection healthy" },
  "persona": { "healthy": true, "message": "Persona connection healthy" }
}
```

---

## 🏦 Banking Integration Examples

### Example 1: Link User's Bank Account (Plaid)

```typescript
// 1. Create link token
const { linkToken } = await bankingProvider.createLinkToken(userId);

// 2. User completes Plaid Link flow in frontend
// (Plaid provides a React component)

// 3. Exchange public token for access token
const { accessToken, itemId } = await bankingProvider.exchangePublicToken(publicToken);

// 4. Get bank accounts
const accounts = await bankingProvider.getBankAccounts(accessToken);

// 5. Save to database
await db.insert(userBankAccounts).values({
  userId,
  plaidAccessToken: accessToken,
  plaidItemId: itemId,
  accountId: accounts[0].id,
  accountMask: accounts[0].mask,
});
```

### Example 2: Initiate ACH Transfer (Dwolla)

```typescript
// Use Dwolla for ACH transfers
const dwolla = integrationRegistry.get<BankingProvider>('dwolla');

const transfer = await dwolla.initiateACH({
  fromAccountId: 'funding-source-1',
  toAccountId: 'funding-source-2',
  amount: 1000,
  description: 'Bond distribution',
});

console.log(`ACH transfer initiated: ${transfer.id}`);
console.log(`Expected completion: ${transfer.expectedCompletionDate}`);
```

### Example 3: Initiate Wire Transfer (Direct Bank)

```typescript
// Use direct bank integration for wire transfers
const bank = integrationRegistry.get<BankingProvider>('direct_bank');

const wire = await bank.initiateWire({
  fromAccountId: 'account-1',
  toRoutingNumber: '121000248',
  toAccountNumber: '1234567890',
  toBankName: 'Wells Fargo',
  toAccountHolderName: 'John Doe',
  amount: 100000,
  description: 'Bond purchase',
});

console.log(`Wire transfer initiated: ${wire.id}`);
```

---

## 💳 Payment Processing Examples

### Example 1: Accept Credit Card Payment (Stripe)

```typescript
const paymentProvider = getPaymentProvider();

// Create customer
const customer = await paymentProvider.createCustomer({
  email: 'john@example.com',
  name: 'John Doe',
});

// Create charge
const charge = await paymentProvider.createCharge({
  amount: 10000, // $100.00
  currency: 'USD',
  customerId: customer.id,
  paymentMethodId: 'pm_123',
  description: 'Bond purchase',
});

if (charge.status === 'succeeded') {
  // Create bond assignment
  await createBondAssignment(userId, bondId, quantity);
}
```

### Example 2: Send Payout to Investor (Stripe)

```typescript
const paymentProvider = getPaymentProvider();

const payout = await paymentProvider.createPayout({
  amount: 5000, // $50.00
  currency: 'USD',
  destination: 'acct_123', // Stripe Connect account
  description: 'Bond distribution',
});

console.log(`Payout status: ${payout.status}`);
```

---

## 🔒 Compliance Integration Examples

### Example 1: KYC Verification

```typescript
import { kycService } from './services/kycService';

// Start verification
const { verificationId, verificationUrl } = await kycService.startVerification(userId, {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  dateOfBirth: '1990-01-01',
  addressLine1: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94102',
  country: 'US',
});

// Send user to verificationUrl to complete KYC

// Check status
const isVerified = await kycService.isVerified(userId);
```

### Example 2: Accredited Investor Verification

```typescript
import { accreditedInvestorService } from './services/accreditedInvestorService';

// Start verification
const { verificationId } = await accreditedInvestorService.startVerification(userId, {
  method: 'income',
  incomeAmount: 250000,
  incomeYear: 2025,
  incomeDocuments: ['url1', 'url2'],
});

// Check status
const isAccredited = await accreditedInvestorService.isAccredited(userId);

// Get investment limit
const limit = await accreditedInvestorService.getInvestmentLimit(userId);
```

---

## 🔌 Adding Your Own Provider

### Step 1: Implement the Interface

```typescript
import { PaymentProvider, CreateChargeData, Charge } from './integrations/IntegrationFramework';

export class YourPaymentProvider implements PaymentProvider {
  name = 'your_provider';
  type = 'payment' as const;
  
  isConfigured(): boolean {
    return Boolean(process.env.YOUR_API_KEY);
  }
  
  async healthCheck() {
    // Check connection to your provider
    return { healthy: true, message: 'Connected', lastChecked: new Date() };
  }
  
  async createCharge(data: CreateChargeData): Promise<Charge> {
    // Call your provider's API
    const response = await fetch('https://your-provider.com/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.YOUR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    return {
      id: result.id,
      amount: result.amount,
      currency: result.currency,
      status: result.status,
      customerId: data.customerId,
      description: data.description,
      createdAt: new Date(result.created),
    };
  }
  
  // Implement other methods...
}
```

### Step 2: Register Your Provider

```typescript
import { integrationRegistry } from './integrations/IntegrationFramework';
import { YourPaymentProvider } from './integrations/YourPaymentProvider';

// Register your provider
integrationRegistry.register(new YourPaymentProvider());
```

### Step 3: Use Your Provider

```typescript
// Get your provider
const provider = integrationRegistry.get<PaymentProvider>('your_provider');

// Use it
const charge = await provider.createCharge({
  amount: 1000,
  currency: 'USD',
  customerId: 'cus_123',
  description: 'Bond purchase',
});
```

---

## 🎯 Best Practices

### 1. Use Multiple Providers for Redundancy

```typescript
// Try primary provider, fall back to secondary
let charge;
try {
  const stripe = integrationRegistry.get<PaymentProvider>('stripe');
  charge = await stripe.createCharge(data);
} catch (error) {
  console.error('Stripe failed, trying PayPal');
  const paypal = integrationRegistry.get<PaymentProvider>('paypal');
  charge = await paypal.createCharge(data);
}
```

### 2. Monitor Provider Health

```bash
# Set up cron job to check provider health
0 * * * * curl http://localhost:3000/api/integrations/health
```

### 3. Log All Transactions

```typescript
// Log to database for audit trail
await db.insert(transactionLog).values({
  provider: 'stripe',
  type: 'charge',
  amount: charge.amount,
  status: charge.status,
  externalId: charge.id,
  createdAt: new Date(),
});
```

### 4. Handle Webhooks Properly

```typescript
// Verify webhook signature
const event = paymentProvider.verifyWebhook(
  req.body,
  req.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET
);

// Handle event
await paymentProvider.handleWebhook(event);
```

---

## 📊 Cost Comparison

### Marketplace Approach (What You Avoid)
| Transaction | Amount | Marketplace Fee (2.9% + $0.30) | Your Net |
|-------------|--------|--------------------------------|----------|
| Bond Purchase | $10,000 | $290.30 | $9,709.70 |
| Distribution | $1,000 | $29.30 | $970.70 |
| **Annual (1000 transactions)** | **$1M** | **$29,300** | **$970,700** |

### Platform Approach (BondAI)
| Transaction | Amount | Stripe Fee (2.9% + $0.30) | Wire Fee | Your Net |
|-------------|--------|---------------------------|----------|----------|
| Bond Purchase | $10,000 | Use wire transfer | $25 | $9,975 |
| Distribution | $1,000 | $29.30 | - | $970.70 |
| **Annual (1000 transactions)** | **$1M** | **$5,000** | **$25,000** | **$970,000** |

**Savings: $4,300/year** (and you control the money flow!)

---

## 🚀 Quick Start

### 1. Minimal Setup (Stripe Only)

```bash
# .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Pros:** Quick setup, works immediately  
**Cons:** Limited to Stripe's capabilities

### 2. Recommended Setup (Stripe + Plaid + Compliance)

```bash
# .env
# Payment
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Banking
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret

# Compliance
KYC_PROVIDER=persona
KYC_API_KEY=your_api_key
AI_PROVIDER=parallel_markets
AI_API_KEY=your_api_key
TAX_PROVIDER=tax1099
TAX_API_KEY=your_api_key
```

**Pros:** Full featured, compliant, flexible  
**Cons:** More setup required

### 3. Enterprise Setup (All Options)

```bash
# .env
# Payment
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Banking
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=production

DWOLLA_KEY=your_key
DWOLLA_SECRET=your_secret
DWOLLA_ENV=production

BANK_API_KEY=your_bank_api_key
BANK_API_URL=https://api.yourbank.com
BANK_NAME=Your Bank

# Compliance
KYC_PROVIDER=persona
KYC_API_KEY=your_api_key
AI_PROVIDER=parallel_markets
AI_API_KEY=your_api_key
TAX_PROVIDER=tax1099
TAX_API_KEY=your_api_key

# Custody
CUSTODIAN_API_KEY=your_custodian_api_key
CUSTODIAN_API_URL=https://api.yourcustodian.com

# Escrow
ESCROW_API_KEY=your_escrow_api_key
ESCROW_API_URL=https://api.yourescrow.com
```

**Pros:** Maximum flexibility, redundancy, control  
**Cons:** Complex setup, more maintenance

---

## 🔍 Health Check API

```bash
# Check all integrations
GET /api/integrations/health

# Response
{
  "stripe": {
    "healthy": true,
    "message": "Stripe connection healthy",
    "lastChecked": "2026-01-16T12:00:00Z"
  },
  "plaid": {
    "healthy": true,
    "message": "Plaid connection healthy",
    "lastChecked": "2026-01-16T12:00:00Z"
  },
  "persona": {
    "healthy": false,
    "message": "Persona not configured",
    "lastChecked": "2026-01-16T12:00:00Z"
  }
}
```

---

## 📞 Support

For integration help:
- **Documentation:** This guide
- **Code Examples:** `/server/integrations/` directory
- **Issues:** https://github.com/ocean824/BONDAI-MANUS-UPDATE/issues
- **Email:** integrations@bondai.com

---

## 🎉 Summary

BondAI is designed as a **platform, not a marketplace**:

✅ **You choose your providers** - Not locked in  
✅ **You control the money** - Direct bank integration  
✅ **You own the relationships** - Your customers, your data  
✅ **Lower fees** - No marketplace cut  
✅ **Maximum flexibility** - Swap providers anytime  
✅ **Enterprise-ready** - Works with your existing systems  

**Built on the original framework** - All improvements are additive, not destructive.

---

**Repository:** https://github.com/ocean824/BONDAI-MANUS-UPDATE  
**Status:** ✅ Platform architecture with full third-party integration support
