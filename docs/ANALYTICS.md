# Analytics & Metrics — TilesERP

Platform analytics and performance tracking documentation.

---

## Dashboard KPIs (Dealer Admin)

### Owner Dashboard (`/dashboard`)
| Metric | Source | Calculation |
|---|---|---|
| Today's Sales | `sales` table | SUM(total_amount) WHERE sale_date = today |
| Today's Revenue | `sales` table | SUM(paid_amount) WHERE sale_date = today |
| Outstanding Dues | `sales` table | SUM(due_amount) WHERE due_amount > 0 |
| Total Customers | `customers` table | COUNT(*) WHERE status = 'active' |
| Total Products | `products` table | COUNT(*) WHERE active = true |
| Low Stock Items | `stock` + `products` | COUNT(*) WHERE box_qty <= reorder_level |
| Monthly Sales Trend | `sales` table | GROUP BY month, SUM(total_amount) |
| Top Products | `sale_items` | GROUP BY product_id, SUM(quantity) LIMIT 10 |
| Top Customers | `sales` | GROUP BY customer_id, SUM(total_amount) LIMIT 10 |
| Payment Status | `sales` | GROUP BY (paid/partial/unpaid) |

### Charts
- **Sales Trend**: Area chart (daily/monthly)
- **Category Split**: Pie chart (Tiles vs Sanitary)
- **Payment Collection**: Bar chart (cash/credit/bank/mobile)
- **Stock Level**: Bar chart (above/below reorder)

---

## Super Admin KPIs (`/super-admin`)

### Platform Dashboard
| Metric | Source | Calculation |
|---|---|---|
| Total Dealers | `dealers` table | COUNT(*) |
| Active Subscriptions | `subscriptions` | COUNT(*) WHERE status = 'active' |
| Expired Subscriptions | `subscriptions` | COUNT(*) WHERE status = 'expired' |
| Suspended Accounts | `subscriptions` | COUNT(*) WHERE status = 'suspended' |
| Monthly Revenue | `subscription_payments` | SUM(amount) WHERE payment_date IN current month |
| Total Revenue (YTD) | `subscription_payments` | SUM(amount) WHERE year = current year |
| New Dealers (This Month) | `dealers` | COUNT(*) WHERE created_at IN current month |
| Plan Distribution | `subscriptions` + `subscription_plans` | GROUP BY plan_id |

### Revenue Analytics
| Metric | Breakdown |
|---|---|
| Revenue by Plan | Starter / Pro / Business |
| Revenue by Period | Monthly / Quarterly / Yearly |
| Payment Methods | Cash / Bank / Mobile Banking |
| Payment Status | Paid / Partial / Pending |
| Collection Rate | Paid / Total * 100 |

### Subscription Status
| Status | Visual | Condition |
|---|---|---|
| Active | 🟢 Green | status = 'active' AND end_date > now |
| Expiring Soon | 🟡 Yellow | end_date within 7 days |
| Grace Period | 🟡 Yellow | Expired within 3 days |
| Expired | 🔴 Red | end_date < now - 3 days |
| Suspended | ⚫ Gray | Manual suspension |

---

## Report Types

### Sales Reports
1. **Daily Sales Summary** — Total sales, payments, dues for a date range
2. **Monthly Sales Report** — Sales grouped by month with trend
3. **Sales by Product** — Products ranked by revenue/quantity
4. **Sales by Customer** — Customers ranked by purchase volume
5. **Sales by Salesman** — Performance comparison (dealer_admin only)
6. **Credit Sales Report** — Outstanding dues with aging analysis

### Purchase Reports
1. **Purchase Summary** — Total purchases by date range
2. **Purchase by Supplier** — Supplier-wise purchase breakdown
3. **Purchase by Product** — Product-wise purchase analysis

### Stock Reports
1. **Stock Summary** — Current stock levels (box, sft, piece)
2. **Low Stock Alert** — Products below reorder level
3. **Stock Movement** — In/Out movement history
4. **Stock Valuation** — Total inventory value (avg cost × qty)

### Financial Reports
1. **Profit & Loss** — Revenue - COGS - Expenses
2. **Cash Flow** — Cash ledger summary
3. **Customer Ledger** — Account statement per customer
4. **Supplier Ledger** — Account statement per supplier
5. **Expense Report** — Expenses by category

### Collection Reports
1. **Outstanding Collections** — All unpaid dues
2. **Collection Follow-ups** — Scheduled follow-ups
3. **Aging Analysis** — Dues by age (0-30, 31-60, 61-90, 90+ days)

---

## Notification Analytics

### Tracked in `notifications` table
| Field | Purpose |
|---|---|
| `channel` | sms / email |
| `type` | sale_notification / daily_summary / registration |
| `status` | pending / sent / failed |
| `retry_count` | Number of retry attempts |
| `sent_at` | Delivery timestamp |
| `error_message` | Failure reason |

### Metrics
- **Delivery Rate**: sent / total × 100
- **Failure Rate**: failed / total × 100
- **Average Retry**: AVG(retry_count) WHERE status = 'sent'

---

## Audit Trail

### Tracked in `audit_logs` table
| Field | Purpose |
|---|---|
| `action` | CREATE, UPDATE, DELETE, SUBSCRIPTION_BYPASS_ATTEMPT |
| `table_name` | Affected table |
| `record_id` | Affected record |
| `old_data` | Previous state (JSON) |
| `new_data` | New state (JSON) |
| `user_id` | Who performed the action |
| `dealer_id` | Which dealer |
| `ip_address` | Client IP |
| `user_agent` | Browser info |

### Tracked Events
- Credit override attempts
- Subscription bypass attempts
- User role changes
- Dealer status changes
- Login failures (in `login_attempts` table)

---

## Performance Metrics

### Frontend
- **Build Size**: ~2.2 MB (gzip: ~596 KB)
- **Initial Load**: < 3s (target)
- **TanStack Query Cache**: 30s stale time
- **Dealer Info Cache**: 5 min

### Backend
- **Health Check Response**: < 100ms
- **API Rate Limit**: 200 req/15min (general), 20 req/15min (auth)
- **Max Request Body**: 10 MB

### Database
- **Connection Pool**: Default Knex settings
- **Query Limit**: 1000 rows (Supabase default)
- **Indexes**: On dealer_id, customer_id, sale_id, product_id
