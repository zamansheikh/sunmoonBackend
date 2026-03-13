import { MgbGiftTrackingSystem } from "./mgb_gift_tracking_system";
import { MgbInvitationTrackingService } from "./mgb_invitation_tracking_service";

export const initializeMagicBallTrackers = () => {
  // Accessing getInstance() triggers the internal registration with MgbTrackerRegistry
  MgbInvitationTrackingService.getInstance();
  MgbGiftTrackingSystem.getInstance();
};
