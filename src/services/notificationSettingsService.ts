/**
 * Service for reading and updating notification_settings for a dealer.
 * Used by the Settings UI to let dealers configure their notification preferences.
 */

import { supabase } from "@/integrations/supabase/client";
import { createLogger } from "@/lib/logger";

const log = createLogger("NotificationSettingsService");

export interface NotificationSettings {
  dealer_id: string;
  enable_sale_sms: boolean;
  enable_sale_email: boolean;
  enable_daily_summary_sms: boolean;
  enable_daily_summary_email: boolean;
  owner_phone: string | null;
  owner_email: string | null;
}

export const notificationSettingsService = {
  async get(dealerId: string): Promise<NotificationSettings | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("notification_settings")
      .select("*")
      .eq("dealer_id", dealerId)
      .maybeSingle();

    if (error) {
      log.error("Failed to fetch notification settings:", error.message);
      return null;
    }
    return data as NotificationSettings | null;
  },

  async upsert(settings: NotificationSettings): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("notification_settings")
      .upsert(settings, { onConflict: "dealer_id" });

    if (error) {
      log.error("Failed to save notification settings:", error.message);
      throw new Error(error.message);
    }
  },
};
