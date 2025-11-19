# Deployment Guide - Judgment Bond AI Platform

## Quick Start

To deploy this application to production on Replit:

### 1. Pre-Deployment Preparation

```bash
# Ensure all schema changes are migrated
npx drizzle-kit generate
tsx scripts/migrate.ts

# Run deployment validation
tsx scripts/deploy.ts
```

### 2. Verify Environment

Ensure these secrets are configured in Replit:

- ✅ `DATABASE_URL` - Production PostgreSQL connection string
- ✅ `SESSION_SECRET` - JWT signing secret
- ✅ `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI API endpoint
- ✅ `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key

### 3. Deploy

Click the **Publish** button in Replit:

1. Replit builds the application (`npm run build`)
2. Migration script runs automatically (`tsx scripts/deploy.ts`)
3. Application starts in production mode (`npm run start`)
4. Health checks validate the deployment

### 4. Post-Deployment Verification

```bash
# Check application is running
curl https://your-app.replit.app/api/health

# Verify database schema
tsx -e "import {db} from './server/db'; import {sql} from 'drizzle-orm'; \
  const tables = await db.execute(sql\`SELECT tablename FROM pg_tables WHERE schemaname='public'\`); \
  console.log('Tables:', tables.rows)"
```

## Database Migration During Deployment

### Automatic Migration Flow

When you publish, the deployment script (`scripts/deploy.ts`) automatically:

1. **Connects to production database** using `DATABASE_URL`
2. **Runs pending migrations** from `migrations/` folder
3. **Validates schema** to ensure all critical tables exist
4. **Enforces real data policy** by scanning for mock/placeholder patterns:
   - ❌ Blocks deployment if "test", "mock", "sample", "demo", or "example" patterns found
   - ❌ Blocks deployment if suspicious CUSIP values (000000000) detected
   - ⚠️ Warns if 10+ judgments have identical amounts (possible mock data)
   - ⚠️ Warns if 5+ bonds have identical face values (possible mock data)
5. **Exits with error** if any step fails (preventing bad deployments)

### Migration Safety

- ✅ **Transactional**: Migrations run in transactions - they either fully succeed or fully rollback
- ✅ **Idempotent**: Safe to run multiple times - already-applied migrations are skipped
- ✅ **Validated**: Schema validation prevents deploying with missing tables
- ✅ **Auditable**: All migrations are version-controlled in `migrations/` folder

## Production Database Setup

### Using Separate Production Database (Recommended)

For maximum safety, use a separate Neon database for production:

1. **Create Production Database** in Neon console
2. **Copy Connection String**: `postgresql://user:pass@host/prod_db`
3. **Update Replit Secrets**:
   - `DATABASE_URL` → Production database URL
   - Keep development URL locally or in a separate repl

### Using Same Database (Development Only)

If using the same database for dev and prod (not recommended):
- Be extra cautious with destructive migrations
- Always backup before deploying
- Test migrations thoroughly in development first

## Rollback Procedures

### If Deployment Fails

The deployment script will **automatically abort** if:
- Database connection fails
- Migration fails
- Schema validation fails
- Critical tables are missing

In this case:
1. Check deployment logs for specific error
2. Fix the issue in development
3. Test the fix locally
4. Re-deploy

### If Deployment Succeeds But App Has Issues

**Option 1: Revert Code**
```bash
# In Replit, use the version control to revert to previous version
# Then re-deploy
```

**Option 2: Database Point-in-Time Restore (Neon)**
```bash
# Use Neon console to restore database to time before deployment
# Warning: This will lose any production data created after that point
```

**Option 3: Manual Migration Rollback**
```bash
# If you have down migrations, run them
# This is manual and requires careful execution
```

## Environment-Specific Configuration

### Development

```bash
NODE_ENV=development
DATABASE_URL=<dev-database-url>
```

### Production

```bash
NODE_ENV=production
DATABASE_URL=<prod-database-url>
```

## Monitoring Production

### Health Checks

The application exposes health check endpoints:

```bash
# Application health
curl https://your-app.replit.app/api/health

# Database connectivity
tsx -e "import {db} from './server/db'; import {sql} from 'drizzle-orm'; \
  await db.execute(sql\`SELECT 1\`); console.log('DB OK')"
```

### Database Metrics

```bash
# Table sizes
tsx -e "import {db} from './server/db'; import {sql} from 'drizzle-orm'; \
  const result = await db.execute(sql\`
    SELECT tablename, 
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
    FROM pg_tables WHERE schemaname = 'public'\`); \
  console.table(result.rows)"

# Record counts
tsx -e "import {db} from './server/db'; \
  import {users, judgments, bundles, bonds} from './shared/schema'; \
  const userCount = await db.select().from(users); \
  const judgmentCount = await db.select().from(judgments); \
  const bundleCount = await db.select().from(bundles); \
  const bondCount = await db.select().from(bonds); \
  console.log({ users: userCount.length, judgments: judgmentCount.length, \
    bundles: bundleCount.length, bonds: bondCount.length })"
```

## Troubleshooting

### Migration Fails in Production

**Symptom**: Deployment script exits with migration error

**Solution**:
1. Check migration SQL in `migrations/0XXX_*.sql`
2. Test migration locally: `tsx scripts/migrate.ts`
3. If needed, create a corrective migration: `npx drizzle-kit generate`
4. Re-deploy

### Database Connection Timeout

**Symptom**: "Connection timeout" or "ECONNREFUSED" errors

**Solution**:
1. Verify `DATABASE_URL` secret is set correctly
2. Check Neon database is active (may need to wake from sleep)
3. Verify network connectivity from Replit to Neon

### Missing Tables After Deployment

**Symptom**: Schema validation fails, "table not found" errors

**Solution**:
1. Run migrations manually: `tsx scripts/migrate.ts`
2. Check migration history: `cat migrations/meta/_journal.json`
3. Verify all migrations are in the `migrations/` folder
4. Re-deploy

## Best Practices

1. ✅ **Test migrations locally** before deploying
2. ✅ **Use additive schema changes** when possible (new tables, nullable columns)
3. ✅ **Backup production data** before major schema changes
4. ✅ **Monitor deployment logs** to catch issues early
5. ✅ **Use Neon branching** to test migrations on production-like data
6. ✅ **Version control** all migration files
7. ✅ **Document breaking changes** in migration comments
8. ✅ **Never use mock data** in production (real data only policy)

## CI/CD Integration

If using automated deployments:

```yaml
# Example GitHub Actions workflow
name: Deploy to Replit
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run pre-deployment checks
        run: |
          npm install
          npx drizzle-kit check
          tsx scripts/deploy.ts
      
      - name: Deploy to Replit
        # Your Replit deployment step
```

## Support

For deployment issues:

1. Check deployment logs in Replit console
2. Review `DATABASE.md` for migration guidance
3. Verify all environment variables are set
4. Test locally first with `tsx scripts/deploy.ts`
5. Contact Replit support for platform-specific issues

---

**Remember**: The deployment script is your safety net. It will prevent bad deployments by validating everything before your app goes live.
