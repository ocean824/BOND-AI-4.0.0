# Bond Exchange + Surety Frontend Components

This folder contains drop-in React components you can mount in your existing
frontend for both the Investor Bond Exchange and the Admin Surety module.

## Investor Components

- `frontend/investors/InvestorOverview.tsx` — shows only aggregated totals of
  upcoming perfected bonds. Uses `GET /investor/overview`.

- `frontend/investors/InvestorExchange.tsx` — lists active auctions and allows
  an investor to place bids. Uses:

  - `GET /investor/auctions`
  - `POST /investor/auctions/:id/bids`

- `frontend/investors/InvestorMyBids.tsx` — shows the logged-in investor's
  historical bids. Uses `GET /investor/my-bids`.

These routes are protected in the backend by:

- `requireAuth(["INVESTOR"])`
- `blockInvestorsForNonInvestorRoutes` (investors cannot see any other APIs).

## Admin Surety Components

- `frontend/admin/surety/SuretyDashboard.tsx` — lists Surety underwriting cases.
  Uses `GET /admin/surety/cases`.

- `frontend/admin/surety/NewJudgmentSuretyWizard.tsx` — simple wizard to create
  a new Judgment Surety case and immediately run underwriting. Uses:

  - `POST /admin/surety/cases`
  - `POST /admin/surety/cases/:id/underwrite`

All Admin Surety routes are protected by:

- `requireAuth(["ADMIN"])`
- `requireSuretyPin` — which expects a `X-Surety-Pin` header to match the
  `SURETY_ADMIN_PIN` environment variable.

### Usage

In your React app, you might do something like:

```tsx
import { SuretyDashboard } from "./frontend/admin/surety/SuretyDashboard";

export function AdminSuretyPage() {
  const [pin, setPin] = useState("");

  // In real life, prompt the admin once for the Surety PIN and store in state
  // or context, then pass it down to the Surety components.

  return (
    <div>
      <input
        type="password"
        placeholder="Enter Surety PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />
      {pin && <SuretyDashboard suretyPin={pin} />}
    </div>
  );
}
```

## Backend Entrypoint

The backend entrypoint is `src/index.ts` and uses Express. Replit will run:

```bash
npm install
npm run dev
```

by default (see `.replit`).

You must set at least:

- `DATABASE_URL` — pointing to your Postgres instance
- `SURETY_ADMIN_PIN` — the PIN checked by Surety routes
- `DEMO_ROLE` — optional (`"ADMIN"` or `"INVESTOR"`) to change the demo user role

In your real app, **replace the demo auth stub** in `src/index.ts` with your real
authentication middleware so that `req.user` is populated appropriately.
