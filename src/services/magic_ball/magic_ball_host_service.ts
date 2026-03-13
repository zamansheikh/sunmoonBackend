import { MAGIC_BALL_CRITERIA } from "../../core/Utils/constants";
import { MAGIC_BALL_CRITERIA_TYPES } from "../../core/Utils/enums";
import { MgbTrackerRegistry } from "./mgb_tracker_registry";

export interface IMagicBallHostService {
  getAllMagicBall(userId: string): Promise<MagicBallResponse[]>;
}

export class MagicBallHostService implements IMagicBallHostService {
  constructor() {}

  async getAllMagicBall(userId: string): Promise<MagicBallResponse[]> {
    const response: MagicBallResponse[] = [];
    const registry = MgbTrackerRegistry.getInstance();

    // Iterate over constants instead of database
    for (const [categoryKey, criteria] of Object.entries(MAGIC_BALL_CRITERIA)) {
      const category = categoryKey as MAGIC_BALL_CRITERIA_TYPES;
      const tracker = registry.getTracker(category);

      for (const milestone of criteria.milestones) {
        let myMilestone = 0;
        let isCompleted = false;

        if (tracker) {
          const progress = await tracker.getProgress(
            userId,
            milestone.milestone,
          );
          myMilestone = progress.myMilestone;
          isCompleted = progress.isCompleted;
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
