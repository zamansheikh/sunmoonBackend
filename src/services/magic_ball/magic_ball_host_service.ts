import { MAGIC_BALL_CRITERIA_TYPES } from "../../core/Utils/enums";
import { MAGIC_BALL_CRITERIA } from "../../core/Utils/constants";
import { MgbInvitationTrackingService } from "./mgb_invitation_tracking_service";
import { MgbGiftTrackingSystem } from "./mgb_gift_tracking_system";

export interface IMagicBallHostService {
  getAllMagicBall(userId: string, roomId?: string): Promise<MagicBallResponse[]>;
}

export class MagicBallHostService implements IMagicBallHostService {
  constructor() {}

  async getAllMagicBall(
    userId: string,
    roomId?: string,
  ): Promise<MagicBallResponse[]> {
    const response: MagicBallResponse[] = [];

    // Trackers
    const invitationProgress =
      await MgbInvitationTrackingService.getInstance().getInviterCurrentProgress(
        userId,
      );

    const globalGiftProgress =
      await MgbGiftTrackingSystem.getInstance().getGlobalGiftProgress(userId);

    const roomGiftProgress = roomId
      ? await MgbGiftTrackingSystem.getInstance().getRoomGiftProgress(
          userId,
          roomId,
        )
      : null;

    // Iterate over constants instead of database
    for (const [categoryKey, criteria] of Object.entries(MAGIC_BALL_CRITERIA)) {
      const category = categoryKey as MAGIC_BALL_CRITERIA_TYPES;

      for (const milestone of criteria.milestones) {
        let myMilestone = 0;
        let isCompleted = false;

        // Process progress based on category type
        if (category === MAGIC_BALL_CRITERIA_TYPES.SuccessfullMicInvitation) {
          myMilestone = invitationProgress.uniqueUserCount;
          isCompleted = invitationProgress.reachedMilestones.includes(
            milestone.milestone,
          );
        } else if (category === MAGIC_BALL_CRITERIA_TYPES.SendGiftUniqueUser) {
          myMilestone = globalGiftProgress.uniqueUserCount;
          isCompleted = globalGiftProgress.reachedMilestones.includes(
            milestone.milestone,
          );
        } else if (
          category === MAGIC_BALL_CRITERIA_TYPES.SendGiftUniqueUserInRoom
        ) {
          // If roomId is provided, show current room progress. Otherwise just show if milestone was ever reached globally
          if (roomGiftProgress) {
            myMilestone = roomGiftProgress.uniqueUserCount;
            isCompleted = roomGiftProgress.reachedMilestones.includes(
              milestone.milestone,
            );
          }
        }

        response.push({
          logo: criteria.logo,
          message: milestone.message,
          rewardCoin: milestone.rewardCoin,
          milestone: milestone.milestone,
          myMilestone,
          isCompleted,
        });
      }
    }

    return response;
  }
}

export interface MagicBallResponse {
  logo: string;
  message: string;
  rewardCoin: number;
  milestone: number;
  myMilestone: number;
  isCompleted: boolean;
}
