# Batch / Shade / Caliber / Lot Tracking

## Overview
Track tile stock by batch/lot/shade/caliber so the system can prevent mixed-shade problems and support same-batch delivery.

## Status Model
- **product_batches** = operational source of truth for batch-level stock
- **stock** table = aggregate summary derived from batch totals
- Sync: service layer writes batch first, then updates stock aggregate

## Key Tables
| Table | Purpose |
|---|---|
| `product_batches` | Batch identity + per-batch stock qty |
| `sale_item_batches` | Junction: which batches allocated per sale item |
| `delivery_item_batches` | Junction: which batches used per delivery item |
| `purchase_items.batch_id` | Links each purchase line to its batch |

## Business Rules
1. One purchase line = one batch
2. Same SKU + same shade + caliber + lot + batch_no → merge (top-up)
3. Different shade/caliber → new batch
4. Sanitary items → DEFAULT batch auto-created
5. Sale allocation uses FIFO (oldest batch first)
6. Mixed-shade allocation triggers warning
7. Backorder qty remains batch-unassigned until future purchase

## Implementation Batches
- **Batch 1** (Done): Schema + Purchase flow + Batch stock summary
- **Batch 2** (Planned): Sale allocation + Mixed-shade warnings
- **Batch 3** (Planned): Delivery batch flow + Reports
