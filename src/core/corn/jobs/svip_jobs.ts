import { SvipService } from "../../../services/svip/svip_service";

/**
 * Runs on the 1st of each month at 00:00 to process premium tier retention/downgrade
 * for all users with currentLevel > 0.
 *
 * Logic per user:
 *   1. Effective level = max(levelStartOfMonth, highest level reached during month)
 *   2. Check if monthlyRechargeCoins >= retentionThreshold × milestoneCoins of effective level
 *   3. If yes → retain level
 *   4. If no  → downgrade by 1 (never below 0)
 *   5. Reset monthlyRechargeCoins to 0 for the new month
 *   6. Sync bucket item to match new level (VIP or SVIP category)
 */
export const svipMonthlyRetentionJob = async () => {
  console.log("[Premium Cron] Starting monthly retention check...");

  try {
    const result = await SvipService.runMonthlyRetention();
    console.log(
      `[Premium Cron] Done. Processed=${result.processed}, Retained=${result.retained}, Downgraded=${result.downgraded}`,
    );
  } catch (error) {
    console.error("[Premium Cron] Monthly retention job failed:", error);
  }
};
