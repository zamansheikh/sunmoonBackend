import { MgbTrackerRegistry } from "../../../services/magic_ball/mgb_tracker_registry";

export const resetMagicBallJob = async () => {
  try {
    console.log("[CRON] Starting Magic Ball Reset Job...");

    const trackers = MgbTrackerRegistry.getInstance().getAllTrackers();
    await Promise.all(trackers.map((tracker) => tracker.resetSystem()));

    console.log("[CRON] Magic Ball Reset Job Completed Successfully.");
  } catch (error) {
    console.error("[CRON] Magic Ball Reset Job Failed:", error);
  }
};

