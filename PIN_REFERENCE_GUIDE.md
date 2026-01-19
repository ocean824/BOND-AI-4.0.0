# PIN Reference Guide - Complete List of Active PINs

## Overview
This document lists all PIN-protected features in the BondAI platform and where PINs need to be generated/configured.

---

## 🔐 Active PIN Locations

### 1. **Surety Admin PIN** (Legacy)
**Location:** Environment Variable  
**Variable Name:** `SURETY_ADMIN_PIN`  
**Purpose:** Grants access to surety underwriting features  
**Used In:**
- `/admin/surety` - Surety dashboard
- Surety underwriting operations
- Bond case management

**How to Set:**
```bash
# In .env file
SURETY_ADMIN_PIN=123456
```

**Permissions:**
- ✅ View surety underwriting
- ✅ View exchange (VIEW ONLY, no trading)
- ✅ View exchange overview (VIEW ONLY)
- ✅ Manage surety cases
- ❌ Cannot trade or place bids
- ❌ Cannot view user details
- ❌ Cannot view audit/ledger/invites

---

### 2. **Admin PIN** (Legacy)
**Location:** Environment Variable  
**Variable Name:** `ADMIN_PIN`  
**Purpose:** Grants full admin access to all features  
**Used In:**
- All admin panel features
- User management
- System configuration

**How to Set:**
```bash
# In .env file
ADMIN_PIN=654321
```

**Permissions:**
- ✅ Full access to all features
- ✅ View users (with PIN)
- ✅ View audit logs
- ✅ View ledger
- ✅ View invites
- ✅ View surety
- ✅ View exchange
- ✅ Trade/bid on exchange
- ✅ Manage surety cases

---

### 3. **Audit & Compliance PIN** (New in v3.3.0)
**Location:** Admin Panel Prompt  
**Feature:** `/admin/audit`  
**Purpose:** Protects access to audit logs and compliance reports  
**Used In:**
- Audit & Compliance page
- Audit log viewing
- Compliance reports

**How to Access:**
1. Login as admin
2. Navigate to Admin Panel
3. Click "Audit & Compliance" card
4. Enter admin PIN when prompted

**Verification:**
- Checks against `ADMIN_PIN` environment variable
- Can be upgraded to database-backed PIN system

---

### 4. **Ledger Entries PIN** (New in v3.3.0)
**Location:** Admin Panel Prompt  
**Feature:** `/admin/ledger`  
**Purpose:** Protects access to double-entry accounting ledger  
**Used In:**
- Ledger Entries page
- Trial balance viewing
- Account balance reports

**How to Access:**
1. Login as admin
2. Navigate to Admin Panel
3. Click "Ledger Entries" card
4. Enter admin PIN when prompted

**Verification:**
- Checks against `ADMIN_PIN` environment variable
- Can be upgraded to database-backed PIN system

---

### 5. **User Details PIN** (New in v3.2.0)
**Location:** Admin Panel Stats  
**Feature:** `/admin/user-details`  
**Purpose:** Protects access to detailed user information  
**Used In:**
- User details page
- User list with roles
- PIN status indicators

**How to Access:**
1. Login as admin
2. Navigate to Admin Panel
3. Click "View Details (PIN)" button on Total Users stat
4. Enter admin PIN in PinDialog component

**Verification:**
- Uses PinDialog component
- Verifies via `/api/admin/pins/verify` endpoint
- Checks against database-backed PINs or environment variables

---

### 6. **Database-Backed PINs** (New in v3.2.0)
**Location:** Database Table `admin_pins`  
**Management:** `/admin/pin-management`  
**Purpose:** Granular PIN management with role-based permissions  

**PIN Types:**
- **Admin PINs** - Full access to all features
- **Surety PINs** - Limited access (view-only exchange, surety management)

**How to Generate:**
1. Login as admin
2. Navigate to Admin Panel
3. Click "PIN Management" card
4. Click "Generate New PIN" button
5. Select user and role (admin or surety)
6. Set expiration date (optional)
7. Copy the generated PIN

**Database Schema:**
```sql
CREATE TABLE admin_pins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  pin_hash TEXT NOT NULL,  -- bcrypt hashed
  role VARCHAR(50) NOT NULL,  -- 'admin' or 'surety'
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**API Endpoints:**
- `POST /api/admin/pins/generate` - Generate new PIN
- `POST /api/admin/pins/verify` - Verify PIN
- `GET /api/admin/pins` - List all PINs
- `POST /api/admin/pins/:id/deactivate` - Deactivate PIN

---

## 📋 PIN Generation Checklist

### Environment Variable PINs (Legacy)
- [ ] Set `ADMIN_PIN` in `.env` file
- [ ] Set `SURETY_ADMIN_PIN` in `.env` file
- [ ] Restart server after changing `.env`
- [ ] Test admin access with PIN
- [ ] Test surety access with PIN

### Database-Backed PINs (New System)
- [ ] Run migration `0007_add_pin_system.sql`
- [ ] Login as admin
- [ ] Navigate to PIN Management
- [ ] Generate admin PIN for yourself
- [ ] Generate surety PIN for surety users
- [ ] Test PIN verification
- [ ] Monitor PIN access logs

---

## 🔄 PIN Migration Path

### Current State (v3.3.0)
- ✅ Environment variable PINs work (backward compatible)
- ✅ Database-backed PINs work
- ✅ Both systems coexist
- ✅ No breaking changes

### Recommended Approach
1. **Keep using environment variables** for now (simple, works)
2. **Generate database PINs** for additional users as needed
3. **Monitor PIN access logs** in admin panel
4. **Gradually migrate** to database-backed PINs over time

### Future Enhancement (Optional)
- Replace all prompt() calls with PinDialog component
- Implement PIN rotation policy
- Add 2FA/MFA support
- Add PIN expiration notifications

---

## 🧪 Testing Checklist

### Test Environment Variable PINs
```bash
# 1. Set PINs in .env
ADMIN_PIN=test123
SURETY_ADMIN_PIN=test456

# 2. Restart server
npm run dev

# 3. Test admin access
- Login as admin
- Click "Audit & Compliance"
- Enter: test123
- Verify access granted

# 4. Test surety access
- Login as surety
- Access surety dashboard
- Enter: test456
- Verify limited access
```

### Test Database-Backed PINs
```bash
# 1. Generate PIN via UI
- Login as admin
- Go to PIN Management
- Generate new PIN
- Copy PIN (e.g., "ABC123")

# 2. Test PIN
- Logout
- Click "View User Details"
- Enter: ABC123
- Verify access granted

# 3. Verify in database
psql $DATABASE_URL
SELECT * FROM admin_pins WHERE is_active = true;
```

---

## 🔒 Security Best Practices

### PIN Strength
- ✅ Minimum 6 characters
- ✅ Mix of letters and numbers
- ✅ Avoid common patterns (123456, password, etc.)
- ✅ Change regularly (every 90 days)

### PIN Storage
- ✅ Never commit PINs to git
- ✅ Use `.env` file (git ignored)
- ✅ Database PINs are bcrypt hashed
- ✅ Access logs track all PIN usage

### PIN Distribution
- ✅ Share PINs securely (encrypted channels)
- ✅ Don't email PINs in plaintext
- ✅ Use temporary PINs with expiration
- ✅ Deactivate PINs when users leave

---

## 📊 PIN Usage Summary

| PIN Type | Location | Purpose | Permissions | Status |
|----------|----------|---------|-------------|--------|
| ADMIN_PIN | .env | Full admin access | All features | ✅ Active |
| SURETY_ADMIN_PIN | .env | Surety access | Limited (view-only exchange) | ✅ Active |
| Audit PIN | Prompt | Audit logs access | Audit & compliance | ✅ Active |
| Ledger PIN | Prompt | Ledger access | Ledger entries | ✅ Active |
| User Details PIN | PinDialog | User info access | User details | ✅ Active |
| Database PINs | admin_pins table | Granular access | Role-based | ✅ Active |

---

## 🚀 Quick Reference

### Where to Generate PINs

1. **Environment Variables** → `.env` file
2. **Database PINs** → Admin Panel → PIN Management → Generate New PIN

### Where PINs Are Used

1. **Surety Dashboard** → SURETY_ADMIN_PIN
2. **Audit & Compliance** → ADMIN_PIN (prompt)
3. **Ledger Entries** → ADMIN_PIN (prompt)
4. **User Details** → Database PIN or ADMIN_PIN (PinDialog)
5. **All Admin Features** → ADMIN_PIN (authentication)

### How to Verify PINs

1. **Environment PINs** → Automatic (middleware checks .env)
2. **Database PINs** → API call to `/api/admin/pins/verify`
3. **Access Logs** → Check `pin_access_logs` table

---

## 📞 Support

If you need help with PINs:
1. Check this guide first
2. Review `PIN_SYSTEM_IMPLEMENTATION.md` for technical details
3. Check `V3_3_0_COMPLETION_REPORT.md` for recent changes
4. Contact support at https://help.manus.im

---

**Last Updated:** v3.3.1  
**Document Status:** ✅ Complete  
**Backward Compatibility:** 100%
