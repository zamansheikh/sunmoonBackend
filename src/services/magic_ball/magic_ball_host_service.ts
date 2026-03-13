import { MAGIC_BALL_CRITERIA_TYPES } from "../../core/Utils/enums";
import { MAGIC_BALL_CRITERIA } from "../../core/Utils/constants";
import { MgbInvitationTrackingService } from "./mgb_invitation_tracking_service";

export interface IMagicBallHostService {
  getAllMagicBall(userId: string): Promise<MagicBallResponse[]>;
}

export class MagicBallHostService implements IMagicBallHostService {
  constructor() {}

  async getAllMagicBall(userId: string): Promise<MagicBallResponse[]> {
    const response: MagicBallResponse[] = [];

    // Trackers
    const invitationProgress =
      await MgbInvitationTrackingService.getInstance().getInviterCurrentProgress(
        userId,
      );

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
