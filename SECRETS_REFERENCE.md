# BOND-AI 4.0.0 - Secrets & Environment Variables Reference

## Overview
This document lists all secrets and environment variables required for the platform. **NEVER commit actual secret values to the repository.**

---

## Required Secrets

### Database

| Secret Key | Description | Example Format |
|------------|-------------|----------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `PGHOST` | Database host | `hostname.neon.tech` |
| `PGPORT` | Database port | `5432` |
| `PGUSER` | Database username | `username` |
| `PGPASSWORD` | Database password | `*****` |
| `PGDATABASE` | Database name | `bondai` |

### Authentication

| Secret Key | Description | Example Format |
|------------|-------------|----------------|
| `SESSION_SECRET` | JWT signing secret | 32+ character random string |
| `ADMIN_USERNAME` | Initial admin username | `AdminXXXXX` |
| `ADMIN_PASSWORD` | Initial admin password | Strong password |

### Payment Processing

| Secret Key | Description | Example Format |
|------------|-------------|----------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_live_*****` or `sk_test_*****` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key | `pk_live_*****` or `pk_test_*****` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing | `whsec_*****` |

### AI Integration

| Secret Key | Description | Example Format |
|------------|-------------|----------------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-*****` |

### PIN System

| Secret Key | Description | Example Format |
|------------|-------------|----------------|
| `SURETY_ADMIN_PIN` | Legacy surety PIN (deprecated) | 6-digit number |

---

## Environment Variables (Non-Secret)

### Application

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `VITE_API_URL` | Frontend API base URL | `/api` |

### Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_TRENDING` | Enable trending topics service | `false` |
| `ENABLE_WEB3` | Enable blockchain features | `false` |

---

## Active Production PINs (v3.3.1)

These PINs are stored in the database (`admin_pins` table), not as environment secrets.

| PIN Role | Code | Permissions |
|----------|------|-------------|
| Primary Admin | `739289` | Full platform access |
| Surety System | `148739` | Underwriting, case management |
| Audit & Compliance | `720402` | Security logs, AI audit |
| Ledger Entries | `822394` | Financial records |

**Note**: PINs can be rotated via the Admin Panel → PIN Management interface.

---

## Test Accounts

### Admin Account
- **Username**: Value of `ADMIN_USERNAME` secret
- **Password**: Value of `ADMIN_PASSWORD` secret
- **Role**: `admin`

### Test Investor
- **Email**: `testinvestor@bondai.app`
- **Password**: `TestInvestor123!`
- **Role**: `investor`
- **Subscription**: Premium tier

---

## Stripe Products Configuration

| Product | Price ID | Monthly Cost |
|---------|----------|--------------|
| Standard Membership | `price_standard_*` | $199 |
| Premium Membership | `price_premium_*` | $299 |

---

## Security Best Practices

1. **Never commit secrets** to version control
2. **Rotate PINs** regularly via admin interface
3. **Use environment-specific secrets** for dev/staging/production
4. **Enable Stripe webhook signature verification** in production
5. **Monitor audit logs** for suspicious activity
6. **Limit admin PIN distribution** to authorized personnel only

---

## Setting Up Secrets

### Replit Deployment
1. Go to Secrets tab in Replit
2. Add each required secret with its value
3. Secrets are automatically available as environment variables

### Local Development
Create a `.env` file (never commit):
```env
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secret-here
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-...
```

### Production Deployment
Use your hosting provider's secrets management:
- Vercel: Environment Variables
- Railway: Variables
- Heroku: Config Vars
- AWS: Secrets Manager
