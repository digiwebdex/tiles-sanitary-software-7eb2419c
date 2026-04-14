# CHANGELOG — TilesERP

All notable changes to the TilesERP project are documented here.

---

## [2026-04-14] — Subscription & Notification Enhancements

### Changed
- **Subscription Edit Dialog**: Added duration presets (1 Month, 1 Year, Custom months) instead of raw date input
- **Subscription Management**: Migrated from legacy `plans` table to `subscription_plans` table with feature flags
- **Dealer Management**: Removed "Change Plan" shortcut; centralized plan changes in Subscription Management
- **SA Dashboard, Revenue, Subscription Status pages**: Updated to use `subscription_plans` references

### Added
- **New Dealer Registration Notifications**: SMS + Email sent to both new dealer and super admin on registration
- **ADMIN_PHONE** and **ADMIN_EMAIL** edge function secrets for super admin notifications
- **Duration selection** in Edit Subscription dialog (1 Month, 1 Year, Custom)

### Database
- Migration: Dropped FK `subscriptions_plan_id_fkey` → `plans`, re-pointed to `subscription_plans`
- Updated existing subscription records to reference new plan IDs

---

## [2026-04-13] — Subscription Plans & Revenue System

### Added
- **Subscription Plans CRUD** in Super Admin panel (name, pricing, max users, SMS/Email/Daily Summary toggles)
- **Subscription Payment Recording** with auto-extension on full payment
- **Yearly Discount Eligibility** check (2 months free, first year only)
- **Revenue Reports** page for super admin
- **Subscription Status Overview** with visual indicators (Active, Expiring Soon, Grace, Expired, Suspended)
- **Plan Management** page (`/super-admin/plans`)

### Changed
- Plans displayed as 3-tier cards (Starter, Pro, Business) on pricing page
- Subscription lifecycle enforcement: Trial → Active → Grace → Expired → Suspended

---

## [2026-04-12] — Notification System

### Added
- **SMS Integration** via BulkSMSBD API
- **Email Integration** via Gmail SMTP
- **Notification Settings** per dealer (enable/disable SMS, Email, Daily Summary)
- **send-notification** edge function
- **daily-summary** edge function (cron at 02:00 AM)
- **test-smtp** edge function for testing email config
- **notification_settings** table with dealer preferences
- **notifications** table for delivery tracking

---

## [2026-04-10] — Super Admin Panel

### Added
- **Super Admin Layout** with sidebar navigation
- **SA Dashboard** with platform-wide KPIs
- **Dealer Management** (view, create users, reset passwords)
- **CMS Page** for website content management
- **System Page** for admin settings
- Automatic super admin redirect on login

---

## [2026-04-08] — Delivery & Collections Module

### Added
- **Deliveries Module** (create, track, complete deliveries)
- **Delivery Items** linked to sale items
- **Collections Module** with follow-up tracking
- **Customer Follow-ups** (schedule, notes, status)
- **Campaign Gifts** management

---

## [2026-04-06] — Credit System & POS

### Added
- **Credit Limit Enforcement** on sales
- **Credit Override** with reason and audit trail
- **Credit Report** page
- **POS Sale Mode** (`/sales/pos`) for quick counter sales
- **Credit Approval Dialog** with owner authorization

---

## [2026-04-04] — Challan & Invoice System

### Added
- **Challan Generation** from sales
- **Modern Challan Document** (print-ready)
- **Sale Invoice Document** with barcode
- **Auto Invoice/Challan Numbering** per dealer (invoice_sequences table)
- **Challan Edit Dialog**
- **Show Price Toggle** on challans

---

## [2026-04-02] — Returns System

### Added
- **Sales Returns** (return items, refund, stock adjustment)
- **Purchase Returns** (return to supplier, debit note)
- **Broken Stock** tracking (is_broken flag on returns)
- **Refund Mode** tracking (cash, bank, mobile)

---

## [2026-03-30] — Ledger System

### Added
- **Customer Ledger** (sales, payments, refunds, adjustments)
- **Supplier Ledger** (purchases, payments)
- **Cash Ledger** (all cash movements)
- **Expense Ledger** with categories
- **Expense Management** module
- **Ledger Page** with multi-tab view

---

## [2026-03-28] — Purchase Module

### Added
- **Purchase Management** (create, view, list)
- **Purchase Items** with landed cost calculation
- **Landed Cost Formula**: purchase_rate + transport + labor + other costs
- **Stock auto-update** on purchase (box_qty, sft_qty, average cost)

---

## [2026-03-25] — Sales Module

### Added
- **Sales Management** (create, edit, list)
- **Sale Items** with quantity and rate
- **Profit Calculation** (COGS, gross profit, net profit)
- **Payment Modes** (cash, credit, bank, mobile)
- **Discount** with reference tracking

---

## [2026-03-22] — Product & Stock Module

### Added
- **Product Management** with categories (Tiles, Sanitary)
- **Unit Types** (box_sft with per_box_sft conversion, piece)
- **Stock Management** (box_qty, sft_qty, piece_qty, reserved quantities)
- **Barcode Generation** and printing
- **Reorder Level** alerts
- **Bulk Import** via Excel upload

---

## [2026-03-20] — Customer & Supplier Module

### Added
- **Customer Management** (retailer, customer, project types)
- **Supplier Management** with GSTIN support
- **Opening Balance** for both customers and suppliers
- **Credit Limit** per customer with max overdue days

---

## [2026-03-18] — Foundation

### Added
- **Multi-tenant Architecture** with dealer isolation
- **Authentication** via Supabase Auth
- **Role-Based Access** (super_admin, dealer_admin, salesman)
- **RLS Policies** on all data tables
- **Landing Page** with pricing and features
- **Login Page**
- **Self-Signup** registration flow
- **Subscription System** foundation
- **Express Backend** with health check
- **PostgreSQL Database** with Knex migrations
- **VPS Deployment** structure (Nginx, PM2, SSL)
- **Audit Logging** system
- **Error Boundary** component
- **Keyboard Shortcuts** hook
