# API Reference — TilesERP

---

## Backend API (Express — Port 3003)

### Health Check
```
GET /api/health
Response: { "status": "ok", "database": "connected" }
```

### Authentication
```
POST /api/auth/login
Body: { "email": string, "password": string }
Response: { "token": string, "refreshToken": string, "user": {...} }
Rate Limit: 20 req / 15 min

POST /api/auth/refresh
Body: { "refreshToken": string }
Response: { "token": string, "refreshToken": string }
```

---

## Supabase Edge Functions

### Self Signup
```
POST /functions/v1/self-signup
Body: {
  "email": string,
  "password": string,
  "name": string,
  "business_name": string,
  "phone": string
}
Auth: Not required
Response: { "success": true, "dealer_id": string }
Side Effects: Creates dealer, user, profile, role, subscription, invoice_sequences. Sends SMS + Email to dealer and admin.
```

### Send Notification
```
POST /functions/v1/send-notification
Body: {
  "type": "sale_notification" | "daily_summary" | "registration",
  "channel": "sms" | "email",
  "dealer_id": string,
  "payload": { ... }
}
Auth: Required (Bearer token)
```

### Check Subscription Status
```
POST /functions/v1/check-subscription-status
Auth: Required
Response: { "status": "active" | "expired" | "suspended", "end_date": string }
```

### Create Dealer User
```
POST /functions/v1/create-dealer-user
Body: {
  "email": string,
  "password": string,
  "name": string,
  "dealer_id": string,
  "role": "dealer_admin" | "salesman"
}
Auth: Required (dealer_admin or super_admin)
```

### Reset Dealer Password
```
POST /functions/v1/reset-dealer-password
Body: { "user_id": string, "new_password": string }
Auth: Required (super_admin)
```

### Submit Contact
```
POST /functions/v1/submit-contact
Body: {
  "name": string,
  "email": string,
  "phone": string,
  "business_name": string,
  "message": string
}
Auth: Not required
```

### Test SMTP
```
POST /functions/v1/test-smtp
Body: { "to": string }
Auth: Required (super_admin)
```

### Daily Summary (Cron)
```
POST /functions/v1/daily-summary
Trigger: Cron job at 02:00 AM daily
Auth: Service role key
```

---

## Supabase Client SDK Patterns

### Query with Dealer Isolation
```typescript
import { supabase } from "@/integrations/supabase/client";

const { data, error } = await supabase
  .from("products")
  .select("*")
  .eq("dealer_id", dealerId)
  .eq("active", true)
  .order("name");
```

### Insert with Dealer ID
```typescript
const { error } = await supabase
  .from("customers")
  .insert({
    dealer_id: dealerId,
    name: "Customer Name",
    type: "customer",
  });
```

### RPC Function Call
```typescript
const { data } = await supabase
  .rpc("generate_next_invoice_no", { _dealer_id: dealerId });
```

### Pagination Pattern
```typescript
const PAGE_SIZE = 20;
const from = page * PAGE_SIZE;
const to = from + PAGE_SIZE - 1;

const { data, count } = await supabase
  .from("sales")
  .select("*, customers(name)", { count: "exact" })
  .eq("dealer_id", dealerId)
  .order("sale_date", { ascending: false })
  .range(from, to);
```
