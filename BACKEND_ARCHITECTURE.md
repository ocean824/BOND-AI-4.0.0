# BOND-AI 4.0.0 - Backend Architecture Documentation

## Overview
The backend is built with Express.js and TypeScript, using Drizzle ORM with PostgreSQL (Neon serverless). It provides a RESTful API with JWT authentication and role-based access control.

---

## Directory Structure

```
server/
├── index.ts              # Entry point, server setup
├── routes.ts             # All API route definitions
├── storage.ts            # Storage interface & implementations
├── auth.ts               # JWT authentication middleware
├── vite.ts               # Vite dev server integration
├── middleware/
│   ├── pinAuth.ts        # PIN verification middleware
│   └── subscription.ts   # Investor subscription checks
├── services/
│   ├── aiService.ts      # OpenAI integration
│   ├── pinService.ts     # PIN management logic
│   ├── inviteCodeService.ts  # Invite code management
│   ├── pricingService.ts # Multi-scenario pricing
│   ├── documentService.ts # PDF generation
│   ├── stripeService.ts  # Payment processing
│   ├── auditService.ts   # Audit logging
│   ├── ledgerService.ts  # Double-entry accounting
│   └── complianceService.ts # KYC/AML services
└── utils/
    ├── validation.ts     # Zod schemas
    └── helpers.ts        # Utility functions

shared/
├── schema.ts             # Drizzle schema definitions
└── types.ts              # Shared TypeScript types
```

---

## Database Schema

### Core Tables

#### `users`
```typescript
{
  id: serial primaryKey,
  username: varchar(50) unique notNull,
  password: varchar(255) notNull,
  email: varchar(255),
  role: varchar(20) default 'analyst', // admin, analyst, investor
  stripeCustomerId: varchar(255),
  subscriptionTier: varchar(20), // standard, premium
  subscriptionStatus: varchar(20), // active, cancelled, past_due
  createdAt: timestamp defaultNow()
}
```

#### `judgments`
```typescript
{
  id: serial primaryKey,
  caseNumber: varchar(100),
  plaintiff: varchar(255),
  defendant: varchar(255),
  amount: decimal(15,2),
  interestRate: decimal(5,2),
  courtName: varchar(255),
  judgmentDate: date,
  filingDate: date,
  status: varchar(50),
  extractedData: jsonb,
  userId: integer references users,
  createdAt: timestamp defaultNow()
}
```

#### `bundles`
```typescript
{
  id: serial primaryKey,
  name: varchar(255),
  description: text,
  totalValue: decimal(15,2),
  trancheStructure: jsonb, // { senior, mezz, equity }
  status: varchar(50),
  userId: integer references users,
  createdAt: timestamp defaultNow()
}
```

#### `bonds`
```typescript
{
  id: serial primaryKey,
  name: varchar(255),
  principalAmount: decimal(15,2),
  couponRate: decimal(5,2),
  maturityDate: date,
  score: integer,
  riskTier: varchar(20),
  status: varchar(50),
  processStep: varchar(50), // JUDGMENT_TO_BOND, PERFECTION, etc.
  bundleId: integer references bundles,
  createdAt: timestamp defaultNow()
}
```

### Admin Tables

#### `admin_pins`
```typescript
{
  id: serial primaryKey,
  userId: integer references users,
  pinHash: varchar(255) notNull,
  role: varchar(50), // admin, surety
  permissions: jsonb,
  isActive: boolean default true,
  createdBy: integer references users,
  createdAt: timestamp defaultNow()
}
```

#### `pin_access_logs`
```typescript
{
  id: serial primaryKey,
  userId: integer references users,
  pinId: integer references admin_pins,
  action: varchar(100),
  success: boolean,
  ipAddress: varchar(50),
  createdAt: timestamp defaultNow()
}
```

#### `invite_codes`
```typescript
{
  id: serial primaryKey,
  code: varchar(50) unique notNull,
  accountType: varchar(20), // analyst, investor, admin
  maxUses: integer,
  usedCount: integer default 0,
  expiresAt: timestamp,
  createdBy: integer references users,
  createdAt: timestamp defaultNow()
}
```

### Financial Tables

#### `ledger_entries`
```typescript
{
  id: serial primaryKey,
  journalId: varchar(50),
  accountCode: varchar(20),
  debit: decimal(15,2),
  credit: decimal(15,2),
  description: text,
  reference: varchar(100),
  createdBy: integer references users,
  createdAt: timestamp defaultNow()
}
```

#### `auctions`
```typescript
{
  id: serial primaryKey,
  bondId: integer references bonds,
  reservePrice: decimal(15,2),
  currentBid: decimal(15,2),
  highestBidderId: integer references users,
  startTime: timestamp,
  endTime: timestamp,
  status: varchar(50), // active, ended, cancelled
  createdAt: timestamp defaultNow()
}
```

---

## Service Layer

### AI Service (`aiService.ts`)

```typescript
class AIService {
  // Document extraction using GPT-4o
  async extractJudgmentData(document: string): Promise<JudgmentData>
  
  // Bond analysis using GPT-5
  async analyzeBond(document: string): Promise<{ score: number, riskTier: string }>
  
  // Document drafting
  async draftDocument(type: string, context: object): Promise<string>
  
  // Conversational assistant
  async chat(message: string, history: Message[]): Promise<string>
  
  // Audit summarization
  async summarizeAuditLogs(logs: AuditLog[]): Promise<string>
  
  // Suspicious activity detection
  async detectSuspiciousActivity(logs: AuditLog[]): Promise<SuspiciousActivity[]>
}
```

### PIN Service (`pinService.ts`)

```typescript
class PINService {
  // Create new PIN with hashing
  async createPIN(userId: number, pin: string, role: string, permissions: object): Promise<void>
  
  // Verify PIN against hash
  async verifyPIN(pin: string, requiredPermission: string): Promise<{ valid: boolean, permissions: object }>
  
  // Log access attempt
  async logAccess(userId: number, pinId: number, action: string, success: boolean): Promise<void>
  
  // Deactivate PIN
  async deactivatePIN(pinId: number): Promise<void>
  
  // List all active PINs
  async listPINs(): Promise<AdminPIN[]>
}
```

### Pricing Service (`pricingService.ts`)

```typescript
class PricingService {
  // Calculate multi-scenario pricing
  async calculateScenarios(params: PricingParams): Promise<{
    baseCase: ScenarioResult,
    optimistic: ScenarioResult,
    stressed: ScenarioResult
  }>
  
  // Calculate discount rate
  calculateDiscountRate(riskScore: number, term: number): number
  
  // Calculate IRR
  calculateIRR(cashFlows: number[], initialInvestment: number): number
  
  // Recovery estimation
  estimateRecovery(judgment: Judgment, scenario: string): number
}
```

### Document Service (`documentService.ts`)

```typescript
class DocumentService {
  // Generate PDF for bond process step
  async generateDocument(bondId: number, step: ProcessStep, type: DocumentType): Promise<Buffer>
  
  // Available document types by step
  getDocumentTypes(step: ProcessStep): DocumentType[]
  
  // Update document status
  async updateStatus(docId: number, status: DocumentStatus): Promise<void>
  
  // Bond Term Sheet
  private generateTermSheet(bond: Bond): Promise<Buffer>
  
  // Perfection Certificate
  private generatePerfectionCert(bond: Bond): Promise<Buffer>
  
  // GIA Document
  private generateGIA(bond: Bond): Promise<Buffer>
}
```

---

## Middleware

### Authentication (`auth.ts`)

```typescript
// JWT verification middleware
function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.SESSION_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Role-based access control
function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.sendStatus(403);
    }
    next();
  };
}
```

### PIN Authentication (`pinAuth.ts`)

```typescript
// PIN verification middleware
async function requirePIN(requiredPermission: string) {
  return async (req, res, next) => {
    const { pin } = req.body;
    const result = await pinService.verifyPIN(pin, requiredPermission);
    
    if (!result.valid) {
      await pinService.logAccess(req.user.id, null, requiredPermission, false);
      return res.status(403).json({ error: 'Invalid PIN' });
    }
    
    await pinService.logAccess(req.user.id, result.pinId, requiredPermission, true);
    req.permissions = result.permissions;
    next();
  };
}
```

### Subscription Check (`subscription.ts`)

```typescript
// Verify active investor subscription
async function requireSubscription(req, res, next) {
  const user = await storage.getUser(req.user.id);
  
  if (user.role !== 'investor') {
    return res.status(403).json({ error: 'Investors only' });
  }
  
  if (user.subscriptionStatus !== 'active') {
    return res.status(403).json({ error: 'Active subscription required' });
  }
  
  next();
}
```

---

## API Route Patterns

### Standard CRUD Pattern

```typescript
// List with pagination
router.get('/api/resource', authenticateToken, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const items = await storage.listResource(req.user.id, page, limit);
  res.json(items);
});

// Get single item
router.get('/api/resource/:id', authenticateToken, async (req, res) => {
  const item = await storage.getResource(req.params.id);
  if (!item) return res.sendStatus(404);
  res.json(item);
});

// Create
router.post('/api/resource', authenticateToken, async (req, res) => {
  const validated = insertResourceSchema.parse(req.body);
  const item = await storage.createResource({ ...validated, userId: req.user.id });
  res.status(201).json(item);
});

// Update
router.patch('/api/resource/:id', authenticateToken, async (req, res) => {
  const validated = updateResourceSchema.parse(req.body);
  const item = await storage.updateResource(req.params.id, validated);
  res.json(item);
});

// Delete
router.delete('/api/resource/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  await storage.deleteResource(req.params.id);
  res.sendStatus(204);
});
```

---

## Error Handling

```typescript
// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err instanceof ZodError) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: err.errors 
    });
  }
  
  if (err.code === 'UNAUTHORIZED') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## Stripe Integration

```typescript
// Webhook handler
router.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object);
      break;
  }
  
  res.json({ received: true });
});
```

---

## Performance Considerations

1. **Database Connection Pooling**: Using Neon's serverless driver with connection pooling
2. **Query Optimization**: Indexed frequently queried columns
3. **Caching**: React Query handles client-side caching
4. **Rate Limiting**: Implemented per-user rate limits
5. **Async Operations**: All I/O operations are non-blocking
