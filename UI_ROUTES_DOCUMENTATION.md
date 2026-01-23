# BOND-AI 4.0.0 - UI Routes & Pages Documentation

## Overview
Complete frontend routing reference for the Judgment Bond AI Platform built with React 18, Vite, and Wouter.

---

## Public Routes

### `/` - Landing Page
- Marketing landing page with platform overview
- Call-to-action for registration
- Feature highlights

### `/login` - Login Page
- User authentication form
- Supports username/password login
- Links to registration

### `/register` - Registration Page
- New user registration
- Optional invite code field
- Role selection (when applicable)

---

## Authenticated Routes (All Users)

### `/dashboard` - Main Dashboard
- Role-based dashboard view
- Quick stats and recent activity
- Navigation to primary features

### `/judgments` - Judgments List
- View all judgment records
- Filter and search functionality
- Quick actions (edit, view, delete)

### `/judgments/new` - Create Judgment
- Form for manual judgment entry
- Document upload with AI extraction
- Multi-step wizard interface

### `/judgments/:id` - Judgment Details
- Full judgment information
- Associated bonds and bundles
- Pricing scenarios
- Edit capabilities

### `/bundles` - Bundles List
- Investment bundle overview
- Tranche visualization
- Bundle status tracking

### `/bundles/new` - Create Bundle
- Bundle creation wizard
- Judgment selection
- Tranche configuration

### `/bundles/:id` - Bundle Details
- Complete bundle view
- Included judgments
- Tranche breakdown
- Teaser PDF generation

### `/bonds` - Bonds List
- All bond instruments
- Status filtering
- Quick navigation

### `/bonds/:id` - Bond Details
- Bond specifications
- Process step tracking
- Document generation
- AI-assisted drafting

### `/underwriting` - Underwriting Dashboard
- Active underwriting cases
- Risk assessment tools
- AI narrative generation

### `/underwriting/:id` - Case Details
- Full underwriting case view
- Multi-party assessment
- Recovery calculations
- Status management

### `/pricing` - Pricing Engine
- Multi-scenario calculator
- Base/Optimistic/Stressed views
- IRR and discount rate analysis

### `/profile` - User Profile
- Account settings
- Password change
- Notification preferences

---

## Investor Routes

### `/exchange` - Bond Exchange
- **Requires**: Active investor subscription
- Live auction listings
- Bid placement interface
- Portfolio tracking

### `/exchange/demo` - Exchange Demo Mode
- Preview exchange without subscription
- Sample auctions
- Feature walkthrough

### `/exchange/auctions/:id` - Auction Details
- Current bid status
- Bid history
- Time remaining
- Place bid form

### `/exchange/portfolio` - Investor Portfolio
- Owned bonds
- Active bids
- Transaction history

### `/membership` - Membership Management
- Current tier display
- Upgrade/downgrade options
- Stripe billing portal access

---

## Admin Routes

### `/admin` - Admin Dashboard
- System overview statistics
- Quick access cards
- User counts, bond totals
- PIN-protected sections

### `/admin/users` - User Management
- All registered users
- Role management
- Account status control
- Invite code tracking

### `/admin/users/:id` - User Details
- **PIN Protected**: Requires Admin PIN
- Detailed user statistics
- Activity history
- Role modification

### `/admin/pins` - PIN Management
- Create/revoke PINs
- Role assignment
- Permission configuration
- Access log viewing

### `/admin/invites` - Invite Code Management
- Generate invite codes
- Set expiration and usage limits
- Track code usage
- Revoke active codes

### `/admin/audit` - Audit & Compliance
- **PIN Protected**: Requires Audit PIN
- AI-powered audit summary
- Suspicious activity flagging
- Security event logs
- Compliance reports

### `/admin/ledger` - Double-Entry Ledger
- **PIN Protected**: Requires Ledger PIN
- Journal entries
- Account balances
- Financial audit trail

### `/admin/surety` - Surety Dashboard
- **PIN Protected**: Requires Surety PIN
- Surety bond cases
- Collateral calculations
- Lifecycle management

### `/admin/exchange` - Exchange Administration
- Auction management
- Reserve price settings
- Trade settlement
- Investor verification

### `/admin/documents` - Document Engine
- Bond process documents
- Status workflow management
- PDF generation
- Template management

### `/admin/trending` - Trending Topics
- Market news management
- AI summarization controls
- Risk/sentiment analysis

---

## Component Architecture

### Layout Components
```
App.tsx
├── SidebarProvider
│   ├── AppSidebar (navigation)
│   └── Main Content Area
│       ├── Header (with SidebarTrigger, ThemeToggle)
│       └── Router (page content)
```

### Key UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `PinDialog` | `components/pin-dialog.tsx` | PIN verification modal |
| `BundleCard` | `components/bundle-card.tsx` | Bundle display card |
| `JudgmentTable` | `components/judgment-table.tsx` | Judgment data table |
| `PricingCalculator` | `components/pricing-calculator.tsx` | Scenario calculator |
| `AuctionCard` | `components/auction-card.tsx` | Exchange auction display |
| `DocumentGenerator` | `components/document-generator.tsx` | PDF generation UI |
| `AuditSummary` | `components/audit-summary.tsx` | AI audit display |

---

## State Management

### React Query Keys
```typescript
// Judgments
queryKey: ['/api/judgments']
queryKey: ['/api/judgments', id]

// Bundles
queryKey: ['/api/bundles']
queryKey: ['/api/bundles', id]

// Bonds
queryKey: ['/api/bonds']
queryKey: ['/api/bonds', id]

// Exchange
queryKey: ['/api/exchange/auctions']
queryKey: ['/api/exchange/bids']

// Admin
queryKey: ['/api/admin/users']
queryKey: ['/api/admin/audit/logs']
queryKey: ['/api/admin/ledger/entries']
```

### Authentication Context
- JWT token stored in localStorage
- Auth context provides user state
- Protected routes check auth status

---

## Theme Support

### Dark/Light Mode
- Toggle in header via ThemeToggle component
- Persisted in localStorage
- CSS variables adapt all components

### Color Scheme
- Primary: Brand blue
- Destructive: Warning/error red
- Muted: Secondary text
- Accent: Highlights and CTAs

---

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Large screens |

---

## Navigation Structure

### Sidebar Menu Items

**Main Section**
- Dashboard
- Judgments
- Bundles
- Bonds
- Underwriting
- Pricing

**Investor Section** (role: investor)
- Bond Exchange
- My Portfolio
- Membership

**Admin Section** (role: admin)
- User Management
- PIN Management
- Invite Codes
- Audit & Compliance
- Ledger
- Surety Dashboard
- Document Engine
