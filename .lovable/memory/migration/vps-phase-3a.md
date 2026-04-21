---
name: vps-phase-3a
description: Phase 3A — Suppliers-only VPS migration. Backend REST routes (GET/POST/PATCH/DELETE) on /api/suppliers with tenant guard; shadow adapter enhanced with id-set + per-field diffing and window.__vpsShadowStats counter. No frontend service is rewired yet — flip via VITE_DATA_SUPPLIERS=shadow|vps. All other resources stay on supabase.
type: feature
---
## Phase 3A scope

- Backend route file: `backend/src/routes/suppliers.ts`
  - Mounted at `/api/suppliers` in `backend/src/index.ts`
  - Auth chain: `authenticate` → `tenantGuard` → `resolveDealerScope`
  - Dealer users are PINNED to their own `dealer_id`; super_admin must pass `dealerId` explicitly.
  - Whitelisted sortable cols: `name, created_at, status, opening_balance, contact_person`
  - Whitelisted filterable cols (via `f.<col>=`): `status, name`
  - Writable cols: `name, contact_person, phone, email, address, gstin, opening_balance, status`
  - `opening_balance` is read-only on PATCH (matches existing supplierService rule).
  - Unique-name conflict surfaces as 409.
- Shadow adapter (`src/lib/data/shadowAdapter.ts`)
  - List: total + row-count + id-set diff (logs missing/extra ids).
  - getById: presence + per-field diff (ignores `created_at`, `updated_at`).
  - Counters at `window.__vpsShadowStats` for browser-console verification.
- Tests: `src/test/suppliersShadow.test.ts` (3 cases) + `src/test/dataClient.test.ts` (3 cases) all pass.

## Rollout flag

- `VITE_DATA_SUPPLIERS=supabase` (default — no behavior change)
- `VITE_DATA_SUPPLIERS=shadow` (read mirrored to VPS, primary still Supabase)
- `VITE_DATA_SUPPLIERS=vps` (full cutover — DO NOT enable until shadow runs clean)

## Not done in 3A (deferred to 3B+)
- Rewiring `supplierService.ts` to use `dataClient` — frontend supplier UI still talks to Supabase directly.
- Customers / Products / Sales / Quotations / Deliveries / Purchases routes.
