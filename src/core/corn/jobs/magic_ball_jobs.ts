import { MgbGiftTrackingSystem } from "../../../services/magic_ball/mgb_gift_tracking_system";
import { MgbInvitationTrackingService } from "../../../services/magic_ball/mgb_invitation_tracking_service";

export const resetMagicBallJob = async () => {
  try {
    console.log("[CRON] Starting Magic Ball Reset Job...");

    await Promise.all([
      MgbInvitationTrackingService.getInstance().resetSystem(),
      MgbGiftTrackingSystem.getInstance().resetSystem(),
    ]);

    console.log("[CRON] Magic Ball Reset Job Completed Successfully.");
  } catch (error) {
    console.error("[CRON] Magic Ball Reset Job Failed:", error);
  }
};
