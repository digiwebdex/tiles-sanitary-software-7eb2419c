# Deployment History — TilesERP

Records of all production deployments to VPS (tserp.digiwebdex.com).

---

## Deployment Log

### #1 — 2026-04-14 (Latest)
**Scope:** Subscription duration presets + Notification system + Plan migration  
**Changes:**
- Added 1 Month / 1 Year / Custom duration selection in Edit Subscription dialog
- Removed "Change Plan" from Dealer Management
- Migrated subscriptions FK from `plans` → `subscription_plans`
- Added dealer registration SMS + Email notifications
- Added `self-signup` edge function with notification triggers
- 10 files changed, 158 insertions, 124 deletions

**Migration:** `20260414035832_20e5c11b-f7a7-4a77-9295-38e5c91dbfae.sql`  
**Result:** ✅ Successful  
**Health Check:** `{"status":"ok","database":"connected"}`

---

### #2 — 2026-04-13
**Scope:** Subscription plans CRUD + Revenue system  
**Changes:**
- Added Plan Management page in Super Admin
- Added Subscription Payment recording with auto-extension
- Added Revenue Reports page
- Added Subscription Status page with lifecycle indicators
- Added yearly discount eligibility check

**Result:** ✅ Successful

---

### #3 — 2026-04-12
**Scope:** Notification system (SMS + Email)  
**Changes:**
- Integrated BulkSMSBD API for SMS
- Integrated Gmail SMTP for Email
- Added notification_settings table
- Added send-notification edge function
- Added daily-summary edge function
- Added test-smtp edge function

**Result:** ✅ Successful

---

### #4 — 2026-04-10
**Scope:** Super Admin panel  
**Changes:**
- Added Super Admin layout with sidebar
- Dashboard with platform KPIs
- Dealer management
- CMS page
- System settings page

**Result:** ✅ Successful

---

### #5 — 2026-04-08
**Scope:** Deliveries + Collections modules  
**Changes:**
- Added delivery tracking system
- Added collections with follow-ups
- Added campaign gift management

**Result:** ✅ Successful

---

### #6 — 2026-04-06
**Scope:** Credit system + POS mode  
**Changes:**
- Credit limit enforcement on sales
- Credit override with audit trail
- POS sale page
- Credit report page

**Result:** ✅ Successful

---

### #7 — 2026-04-04
**Scope:** Challan + Invoice system  
**Changes:**
- Challan generation from sales
- Modern challan document template
- Sale invoice with barcode
- Auto numbering system

**Result:** ✅ Successful

---

### #8 — 2026-04-02
**Scope:** Returns system  
**Changes:**
- Sales returns with stock adjustment
- Purchase returns
- Broken stock tracking

**Result:** ✅ Successful

---

### #9 — 2026-03-30
**Scope:** Ledger system  
**Changes:**
- Customer, Supplier, Cash, Expense ledgers
- Multi-tab ledger page
- Expense management

**Result:** ✅ Successful

---

### #10 — 2026-03-28
**Scope:** Purchase module  
**Changes:**
- Purchase CRUD
- Landed cost calculation
- Stock auto-update on purchase

**Result:** ✅ Successful

---

### #11 — 2026-03-25
**Scope:** Sales module  
**Changes:**
- Sales CRUD with profit calculation
- Payment modes
- Discount tracking

**Result:** ✅ Successful

---

### #12 — 2026-03-22
**Scope:** Product + Stock module  
**Changes:**
- Product management with categories
- Stock tracking
- Barcode generation
- Bulk import

**Result:** ✅ Successful

---

### #13 — 2026-03-20
**Scope:** Customer + Supplier module  
**Changes:**
- Customer CRUD (types: retailer, customer, project)
- Supplier CRUD with GSTIN
- Opening balances
- Credit limits

**Result:** ✅ Successful

---

### #14 — 2026-03-18 (Initial)
**Scope:** Foundation deployment  
**Changes:**
- Multi-tenant architecture
- Authentication + RBAC
- Landing page + public pages
- Express backend setup
- Database schema (001_initial_schema)
- Nginx + PM2 + SSL configuration
- VPS initial setup

**Result:** ✅ Successful

---

## Server Info

| Property | Value |
|---|---|
| VPS Provider | Hostinger |
| IP | 187.77.144.38 |
| Domain | tserp.digiwebdex.com |
| Project Directory | /var/www/tilessaas |
| PM2 Process Name | tilessaas-api |
| Backend Port | 3003 |
| Database Port | 5440 |
| SSL | Let's Encrypt (auto-renew) |
