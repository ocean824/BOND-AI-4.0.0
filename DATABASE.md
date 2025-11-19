# Database Synchronization & Migration Guide

## Overview

The Judgment Bond AI Platform uses **Drizzle ORM** with **PostgreSQL (Neon)** and implements a migration-driven database synchronization system to ensure safe schema changes from development to production.

## Architecture

### Environment Separation

- **Development Database**: Local Neon database for development and testing
- **Production Database**: Separate Neon database for live deployment
- **Credentials**: Stored securely in Replit Secrets (`DATABASE_URL`)

### Migration Strategy

We use **Drizzle Kit migrations** instead of direct schema push to ensure:
- ✅ Version-controlled schema changes
- ✅ Auditable database evolution
- ✅ Safe production deployments
- ✅ Rollback capability
- ✅ Zero data loss

## Workflow

### 1. Making Schema Changes

When you need to modify the database schema:

```bash
# 1. Edit your schema in shared/schema.ts
vim shared/schema.ts

# 2. Generate a migration file
npx drizzle-kit generate

# 3. Review the generated SQL in migrations/
cat migrations/0001_*.sql

# 4. Apply the migration to development database
tsx scripts/migrate.ts
```

### 2. Development Migration Commands

```bash
# Generate a new migration from schema changes
npx drizzle-kit generate

# Apply pending migrations to database
tsx scripts/migrate.ts

# Check for schema drift (differences between schema.ts and database)
npx drizzle-kit check

# Drop a migration (use with caution!)
npx drizzle-kit drop
```

### 3. Pre-Deployment Checklist

Before publishing to production:

```bash
# Run the deployment script
tsx scripts/deploy.ts
```

This script will:
1. ✅ Verify database connection
2. ✅ Run all pending migrations
3. ✅ Validate critical tables exist
4. ✅ Check real data policy compliance
5. ✅ Ensure admin user exists (auto-creates if missing)
6. ✅ Confirm safe deployment state

### 4. Production Deployment

When you publish your application on Replit:

1. **Automatic Migration**: The deployment script runs migrations before starting the app
2. **Validation**: Schema is validated to prevent broken deployments
3. **Safety**: Migrations are transactional - they either fully succeed or fully rollback

## Migration Best Practices

### Additive-First Schema Evolution

Prefer **additive changes** that don't break existing data:

```typescript
// ✅ GOOD: Adding a nullable column
newField: varchar("new_field"),

// ✅ GOOD: Adding a new table
export const newTable = pgTable("new_table", { ... });

// ⚠️ CAUTION: Adding a required column (use default value)
requiredField: varchar("required_field").notNull().default("default_value"),
```

### Two-Phase Migrations for Breaking Changes

For destructive operations, use a two-phase approach:

**Phase 1: Add shadow column**
```sql
ALTER TABLE judgments ADD COLUMN debtor_name_v2 VARCHAR(500);
UPDATE judgments SET debtor_name_v2 = debtor_name WHERE debtor_name_v2 IS NULL;
```

**Phase 2: Swap and cleanup** (after verifying data)
```sql
ALTER TABLE judgments DROP COLUMN debtor_name;
ALTER TABLE judgments RENAME COLUMN debtor_name_v2 TO debtor_name;
```

### Rollback Strategy

If a migration fails in production:

1. **Immediate**: Drizzle migrations run in transactions - failures auto-rollback
2. **Manual Rollback**: Use Neon's point-in-time restore or database branching
3. **Revert Code**: Deploy previous version while fixing migration

## Real Data Policy

**CRITICAL**: This application enforces a "real data only" policy with automated validation:

- ❌ **Never** commit mock/placeholder data in migrations
- ❌ **Never** create fake judgment records in seed scripts
- ✅ **Only** migrate schema and structure
- ✅ **Only** backfill with real court judgment data

### Automated Real Data Policy Enforcement

The deployment script (`scripts/deploy.ts`) **blocks production deployments** if mock data is detected:

**Pattern Detection**: Scans for placeholder keywords in critical tables:
- Judgments: `test`, `mock`, `sample`, `placeholder`, `demo`, `example`
- Bonds: `test`, `mock`, `sample`, `placeholder`, `demo`, `example`, `000000000`
- Case numbers: `TEST-`, `MOCK-`, `SAMPLE-`, `DEMO-`, `EXAMPLE-` prefixes

**Uniformity Detection**: Warns about suspiciously uniform data:
- 10+ judgments with identical `judgment_amount`
- 5+ bonds with identical `face_value`

**Enforcement**: Deployment will **fail with error** if violations are found in production.

### Migration Data Validation

All migrations are logged and auditable:
```bash
# View migration history
cat migrations/meta/_journal.json

# Check what tables exist
tsx -e "import {db} from './server/db'; import {sql} from 'drizzle-orm'; \
  db.execute(sql\`SELECT tablename FROM pg_tables WHERE schemaname='public'\`)"

# Test real data policy enforcement (development only)
NODE_ENV=production tsx scripts/deploy.ts
```

## Environment Variables

### Required Secrets

Configure in Replit Secrets:

```bash
DATABASE_URL=postgresql://user:password@host/database  # Development database
DATABASE_URL_PROD=postgresql://user:password@host/prod # Production database (optional)
SESSION_SECRET=your-jwt-secret-key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://...
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
```

### Database URL Format

```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

## Troubleshooting

### Migration Generation Issues

**Problem**: `drizzle-kit generate` shows no changes
```bash
# Solution: Check for schema drift
npx drizzle-kit check

# Force regenerate
rm -rf migrations/
npx drizzle-kit generate
```

### Migration Application Failures

**Problem**: Migration fails with foreign key constraint errors
```bash
# Solution: Check migration order in migrations/meta/_journal.json
# Ensure parent tables are created before child tables with foreign keys
```

**Problem**: "relation already exists" error
```bash
# Solution: The table already exists in the database
# Option 1: Drop the migration if it's not needed
npx drizzle-kit drop

# Option 2: Manually update migrations/meta/_journal.json to skip
```

### Production Deployment Issues

**Problem**: Deployment script fails validation
```bash
# Solution: Check deployment logs
tsx scripts/deploy.ts

# Verify database connection
tsx -e "import {db} from './server/db'; import {sql} from 'drizzle-orm'; \
  await db.execute(sql\`SELECT NOW()\`)"
```

## Advanced Topics

### Database Branching with Neon

Neon supports database branching for safe testing:

```bash
# Create a branch for testing migrations
# (via Neon console or API)

# Point DATABASE_URL to branch
DATABASE_URL=postgresql://...@...ep-branch-name.neon.tech/...

# Test migrations
tsx scripts/migrate.ts

# Merge to main if successful
```

### Migration Squashing

After accumulating many migrations:

```bash
# 1. Backup production database
# 2. Drop all migrations locally
rm -rf migrations/

# 3. Regenerate from current schema
npx drizzle-kit generate

# 4. Test on development database
tsx scripts/migrate.ts

# 5. Deploy to production (after thorough testing)
```

### Custom Migration Logic

For complex data transformations, add TypeScript logic to migrations:

```typescript
// migrations/custom/backfill-bond-data.ts
import { db } from "../server/db";
import { bonds } from "../shared/schema";

async function backfillBondData() {
  // Your custom migration logic using real data
  const bondsToUpdate = await db.select().from(bonds).where(...);
  
  for (const bond of bondsToUpdate) {
    // Transform using real data only
    await db.update(bonds).set({ ... }).where(...);
  }
}
```

## Monitoring & Observability

### Migration History

```bash
# View all applied migrations
cat migrations/meta/_journal.json | jq

# Count total migrations
ls -1 migrations/*.sql | wc -l
```

### Database Health Checks

```bash
# Check table counts
tsx -e "import {db} from './server/db'; import {sql} from 'drizzle-orm'; \
  const result = await db.execute(sql\`
    SELECT schemaname, tablename, 
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
    FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename\`); \
  console.table(result.rows)"
```

## Support

For issues with database synchronization:

1. Check this documentation first
2. Review migration logs in `migrations/meta/_journal.json`
3. Verify environment variables are set correctly
4. Test migrations in development before production deployment
5. Use Neon branching for safe production testing

## Summary

✅ **Generate migrations** with `npx drizzle-kit generate`
✅ **Apply to dev** with `tsx scripts/migrate.ts`
✅ **Pre-deploy check** with `tsx scripts/deploy.ts`
✅ **Deploy** - migrations run automatically
✅ **Monitor** - check logs and validate data

**Remember**: Always test migrations in development first, never use mock data, and maintain backwards compatibility whenever possible.
