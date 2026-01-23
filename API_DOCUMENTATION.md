# BOND-AI 4.0.0 - API Documentation

## Overview
Complete REST API reference for the Judgment Bond AI Platform. All endpoints require authentication unless marked as public.

---

## Authentication

### POST `/api/auth/register`
Register a new user account.
- **Body**: `{ username, password, email, role?, inviteCode? }`
- **Response**: `{ user, token }`

### POST `/api/auth/login`
Authenticate user and receive JWT token.
- **Body**: `{ username, password }`
- **Response**: `{ user, token }`

### GET `/api/auth/me`
Get current authenticated user.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: User object

---

## Judgments

### GET `/api/judgments`
List all judgments (filtered by user role).
- **Response**: Array of judgment objects

### POST `/api/judgments`
Create a new judgment record.
- **Body**: Judgment data object
- **Response**: Created judgment

### GET `/api/judgments/:id`
Get judgment by ID.

### PATCH `/api/judgments/:id`
Update judgment record.

### DELETE `/api/judgments/:id`
Delete judgment (Admin only).

### POST `/api/judgments/extract`
AI-powered extraction from uploaded document.
- **Body**: `{ documentContent, documentType }`
- **Response**: Extracted structured data

---

## Bundles

### GET `/api/bundles`
List all investment bundles.

### POST `/api/bundles`
Create new bundle with tranche structure.
- **Body**: `{ name, description, judgmentIds, tranches }`

### GET `/api/bundles/:id`
Get bundle details with associated judgments.

### PATCH `/api/bundles/:id`
Update bundle configuration.

### POST `/api/bundles/:id/generate-teaser`
Generate investor teaser PDF for bundle.
- **Response**: PDF file download

---

## Bonds

### GET `/api/bonds`
List all bonds.

### POST `/api/bonds`
Create new bond instrument.

### GET `/api/bonds/:id`
Get bond details.

### PATCH `/api/bonds/:id`
Update bond record.

### POST `/api/bonds/extract`
AI extraction of bond data from document.
- **Body**: `{ documentContent }`
- **Response**: `{ score, riskTier, extractedData }`

### POST `/api/bonds/:id/draft-document`
AI-assisted document drafting.
- **Body**: `{ documentType }`
- **Response**: Generated document content

---

## Underwriting

### GET `/api/underwriting`
List underwriting cases.

### POST `/api/underwriting`
Create new underwriting case.

### GET `/api/underwriting/:id`
Get underwriting case details.

### PATCH `/api/underwriting/:id`
Update underwriting case.

### POST `/api/underwriting/:id/calculate`
Run risk and recovery calculations.
- **Response**: `{ riskScore, recoveryEstimate, recommendations }`

### POST `/api/underwriting/:id/narrative`
Generate AI narrative summary.
- **Response**: `{ narrative }`

---

## Pricing Engine

### POST `/api/pricing/calculate`
Calculate multi-scenario pricing.
- **Body**: `{ judgmentAmount, debtorProfile, collateralValue }`
- **Response**: `{ baseCase, optimistic, stressed }`

### GET `/api/pricing/scenarios/:judgmentId`
Get saved pricing scenarios for judgment.

---

## Bond Exchange

### GET `/api/exchange/auctions`
List active auctions (requires investor subscription).

### POST `/api/exchange/auctions`
Create new auction (Admin only).
- **Body**: `{ bondId, reservePrice, duration }`

### GET `/api/exchange/auctions/:id`
Get auction details.

### POST `/api/exchange/auctions/:id/bid`
Place bid on auction.
- **Body**: `{ amount }`
- **Requires**: Active investor subscription

### GET `/api/exchange/bids`
Get user's bid history.

---

## Surety Bond System

### GET `/api/surety/cases`
List surety underwriting cases (PIN protected).

### POST `/api/surety/cases`
Create new surety case.

### GET `/api/surety/cases/:id`
Get surety case details.

### PATCH `/api/surety/cases/:id`
Update surety case.

### POST `/api/surety/cases/:id/calculate-collateral`
Calculate risk-based collateral requirements.
- **Response**: `{ collateralAmount, riskFactors }`

---

## Investor Membership

### GET `/api/membership/status`
Get current subscription status.

### POST `/api/membership/create-checkout`
Create Stripe checkout session.
- **Body**: `{ tier: 'standard' | 'premium' }`
- **Response**: `{ checkoutUrl }`

### POST `/api/membership/portal`
Create Stripe billing portal session.
- **Response**: `{ portalUrl }`

### POST `/api/webhooks/stripe`
Stripe webhook handler (internal).

---

## Document Engine (Admin Only)

### GET `/api/documents/types`
List available document types.

### POST `/api/documents/generate`
Generate document for bond process step.
- **Body**: `{ bondId, processStep, documentType }`
- **Response**: PDF document

### GET `/api/documents/:bondId`
List documents for a bond.

### PATCH `/api/documents/:id/status`
Update document status (DRAFT → FINAL → SIGNED → ARCHIVED).

---

## Admin APIs

### PIN Verification

#### POST `/api/admin/pin/verify`
Verify PIN for protected actions.
- **Body**: `{ pin, requiredPermission }`
- **Response**: `{ valid, permissions }`

#### GET `/api/admin/pins`
List all PINs (Admin only).

#### POST `/api/admin/pins`
Create new PIN.
- **Body**: `{ pin, role, permissions }`

#### DELETE `/api/admin/pins/:id`
Deactivate PIN.

### Invite Codes

#### GET `/api/admin/invites`
List invite codes.

#### POST `/api/admin/invites`
Generate new invite code.
- **Body**: `{ accountType, maxUses?, expiresAt? }`

#### DELETE `/api/admin/invites/:id`
Revoke invite code.

### Audit & Compliance

#### GET `/api/admin/audit/logs`
Get system audit logs.

#### GET `/api/admin/audit/summary`
AI-generated audit summary.

#### GET `/api/admin/audit/suspicious`
AI-flagged suspicious activities.

### Ledger

#### GET `/api/admin/ledger/entries`
Get double-entry ledger entries.

#### POST `/api/admin/ledger/entries`
Create journal entry.

#### GET `/api/admin/ledger/balance`
Get account balances.

### User Management

#### GET `/api/admin/users`
List all users.

#### GET `/api/admin/users/:id`
Get user details (PIN protected).

#### PATCH `/api/admin/users/:id`
Update user role/status.

---

## AI Integration Endpoints

### POST `/api/ai/chat`
Conversational AI assistant.
- **Body**: `{ message, context? }`
- **Response**: `{ response }`

### POST `/api/ai/summarize`
Document summarization.
- **Body**: `{ content, type }`
- **Response**: `{ summary }`

### POST `/api/ai/extract`
Generic AI data extraction.
- **Body**: `{ document, schema }`
- **Response**: Extracted data matching schema

---

## Trending Topics (Optional Python Service)

### GET `/api/trending`
Get bond market trending topics.

### GET `/api/trending/:id`
Get topic details with AI analysis.

---

## Compliance Infrastructure (v3.0)

### KYC/AML

#### POST `/api/compliance/kyc/start`
Initiate KYC verification.

#### GET `/api/compliance/kyc/status/:userId`
Get KYC status.

### Accredited Investor

#### POST `/api/compliance/accreditation/verify`
Submit accreditation verification.

#### GET `/api/compliance/accreditation/status/:userId`
Get accreditation status.

### Tax Reporting

#### GET `/api/compliance/tax/w9/:userId`
Get W-9 form status.

#### POST `/api/compliance/tax/1099/generate`
Generate 1099 forms.

---

## Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |

---

## Rate Limits

- Standard users: 100 requests/minute
- Premium investors: 500 requests/minute
- Admin users: Unlimited

---

## WebSocket Events

### Connection
```javascript
const ws = new WebSocket('wss://your-domain/ws');
ws.send(JSON.stringify({ type: 'auth', token: 'jwt-token' }));
```

### Event Types
- `auction.bid` - New bid placed
- `auction.ended` - Auction completed
- `bond.status` - Bond status change
- `notification` - User notification
