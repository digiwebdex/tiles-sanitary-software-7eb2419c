import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const today = new Date();
  // Bangladesh is UTC+6, adjust if server is UTC
  const bdToday = new Date(today.getTime() + 6 * 60 * 60 * 1000);
  const dateStr = bdToday.toISOString().split("T")[0];

  console.log(`[DailySummary] Running for date: ${dateStr}`);

  try {
    // 1. Get all active dealers with notification settings
    const { data: dealers, error: dealerErr } = await supabase
      .from("notification_settings")
      .select("dealer_id, owner_phone, owner_email, enable_daily_summary_sms, enable_daily_summary_email");

    if (dealerErr) {
      console.error("[DailySummary] Failed to fetch dealers:", dealerErr.message);
      return new Response(JSON.stringify({ error: dealerErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dealers || dealers.length === 0) {
      console.log("[DailySummary] No dealers with notification settings found");
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let errors = 0;

    for (const dealer of dealers) {
      const { dealer_id, owner_phone, owner_email, enable_daily_summary_sms, enable_daily_summary_email } = dealer;

      // Skip if neither SMS nor email is enabled
      if (!enable_daily_summary_sms && !enable_daily_summary_email) continue;

      try {
        // 2. Fetch daily sales stats for this dealer
        const { data: sales, error: salesErr } = await supabase
          .from("sales")
          .select("total_amount, paid_amount, due_amount, net_profit, cogs")
          .eq("dealer_id", dealer_id)
          .eq("sale_date", dateStr);

        if (salesErr) {
          console.error(`[DailySummary] Sales fetch error for ${dealer_id}:`, salesErr.message);
          errors++;
          continue;
        }

        const totalSales = sales?.length ?? 0;
        const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.total_amount || 0), 0) ?? 0;
        const totalPaid = sales?.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0) ?? 0;
        const totalDue = sales?.reduce((sum, s) => sum + Number(s.due_amount || 0), 0) ?? 0;
        const totalProfit = sales?.reduce((sum, s) => sum + Number(s.net_profit || 0), 0) ?? 0;
        const totalCogs = sales?.reduce((sum, s) => sum + Number(s.cogs || 0), 0) ?? 0;

        // 3. Fetch daily purchases
        const { data: purchases } = await supabase
          .from("purchases")
          .select("total_amount")
          .eq("dealer_id", dealer_id)
          .eq("purchase_date", dateStr);

        const totalPurchases = purchases?.length ?? 0;
        const totalPurchaseAmount = purchases?.reduce((sum, p) => sum + Number(p.total_amount || 0), 0) ?? 0;

        // 4. Fetch daily collections (payments received)
        const { data: collections } = await supabase
          .from("customer_ledger")
          .select("amount")
          .eq("dealer_id", dealer_id)
          .eq("entry_date", dateStr)
          .eq("type", "payment");

        const totalCollections = collections?.reduce((sum, c) => sum + Number(c.amount || 0), 0) ?? 0;

        // 5. Fetch dealer name
        const { data: dealerInfo } = await supabase
          .from("dealers")
          .select("name")
          .eq("id", dealer_id)
          .single();

        const dealerName = dealerInfo?.name ?? "Dealer";

        // 6. Build the summary payload
        const payload = {
          date: dateStr,
          total_sales: totalSales,
          total_revenue: totalRevenue,
          total_paid: totalPaid,
          total_due: totalDue,
          total_profit: totalProfit,
          total_cogs: totalCogs,
          total_purchases: totalPurchases,
          total_purchase_amount: totalPurchaseAmount,
          total_collections: totalCollections,
          dealer_name: dealerName,
        };

        // 7. Build detailed message
        const smsMessage = `${dealerName}\n📊 দৈনিক রিপোর্ট (${dateStr})\n\n` +
          `🛒 বিক্রয়: ${totalSales} টি\n` +
          `💰 বিক্রয় মূল্য: ৳${totalRevenue.toLocaleString()}\n` +
          `✅ আদায়: ৳${totalPaid.toLocaleString()}\n` +
          `⏳ বকেয়া: ৳${totalDue.toLocaleString()}\n` +
          `📈 লাভ: ৳${totalProfit.toLocaleString()}\n` +
          `📦 ক্রয়: ${totalPurchases} টি (৳${totalPurchaseAmount.toLocaleString()})\n` +
          `💵 আজকের কালেকশন: ৳${totalCollections.toLocaleString()}`;

        const emailBody = `${dealerName} - Daily Business Report\n` +
          `Date: ${dateStr}\n` +
          `${"─".repeat(40)}\n\n` +
          `SALES SUMMARY\n` +
          `  Total Sales: ${totalSales}\n` +
          `  Revenue: ৳${totalRevenue.toLocaleString()}\n` +
          `  Paid: ৳${totalPaid.toLocaleString()}\n` +
          `  Due: ৳${totalDue.toLocaleString()}\n` +
          `  Profit: ৳${totalProfit.toLocaleString()}\n` +
          `  COGS: ৳${totalCogs.toLocaleString()}\n\n` +
          `PURCHASE SUMMARY\n` +
          `  Total Purchases: ${totalPurchases}\n` +
          `  Purchase Amount: ৳${totalPurchaseAmount.toLocaleString()}\n\n` +
          `COLLECTIONS\n` +
          `  Today's Collection: ৳${totalCollections.toLocaleString()}\n\n` +
          `${"─".repeat(40)}\n` +
          `This is an automated daily summary from your Tiles & Sanitary ERP system.`;

        // 8. Send SMS
        if (enable_daily_summary_sms && owner_phone) {
          const { data: smsNotif } = await supabase
            .from("notifications")
            .insert({
              dealer_id,
              channel: "sms",
              type: "daily_summary",
              payload,
              status: "pending",
            })
            .select("id")
            .single();

          if (smsNotif) {
            await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                notification_id: smsNotif.id,
                dealer_id,
                channel: "sms",
                type: "daily_summary",
                payload: { ...payload, _custom_message: smsMessage },
                recipient: owner_phone,
              }),
            });
          }
        }

        // 9. Send Email
        if (enable_daily_summary_email && owner_email) {
          const { data: emailNotif } = await supabase
            .from("notifications")
            .insert({
              dealer_id,
              channel: "email",
              type: "daily_summary",
              payload,
              status: "pending",
            })
            .select("id")
            .single();

          if (emailNotif) {
            await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                notification_id: emailNotif.id,
                dealer_id,
                channel: "email",
                type: "daily_summary",
                payload: { ...payload, _custom_message: emailBody },
                recipient: owner_email,
              }),
            });
          }
        }

        processed++;
        console.log(`[DailySummary] ✓ Processed dealer ${dealer_id} (${dealerName})`);

      } catch (dealerErr) {
        const msg = dealerErr instanceof Error ? dealerErr.message : String(dealerErr);
        console.error(`[DailySummary] Error processing dealer ${dealer_id}:`, msg);
        errors++;
      }
    }

    // Log the run
    await supabase.from("audit_logs").insert({
      action: "DAILY_SUMMARY_SENT",
      table_name: "notifications",
      new_data: {
        date: dateStr,
        dealers_processed: processed,
        errors,
        run_at: new Date().toISOString(),
      },
    });

    console.log(`[DailySummary] Complete. Processed: ${processed}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({ success: true, processed, errors, date: dateStr }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[DailySummary] Fatal error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
