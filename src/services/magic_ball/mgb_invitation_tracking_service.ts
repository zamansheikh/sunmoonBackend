import { RepositoryProviders } from "../../core/providers/repository_providers";
import { RedisFolderProvider } from "../../core/redis/redis_folder_provider";
import { RedisService } from "../../core/redis/redis_service";
import { MAGIC_BALL_CRITERIA } from "../../core/Utils/constants";
import { MAGIC_BALL_CRITERIA_TYPES } from "../../core/Utils/enums";

export class MgbInvitationTrackingService {
  private static instance: MgbInvitationTrackingService | null = null;

  // repository
  private readonly UserStatsRepository =
    RepositoryProviders.userStatsRepositoryProvider;

  // redis
  private readonly redisService = RedisService.getInstance();
  private readonly MGBTrackingFolder =
    RedisFolderProvider.MgbInvitationTrackingServiceFolderPrefix;

  private readonly INVITATION_MILESTONE_REACHED_KEY_PREFIX = `${this.MGBTrackingFolder}:invitation_milestone_reached`;
  private readonly INVITATION_UNIQUE_USER_KEY_PREFIX = `${this.MGBTrackingFolder}:invitation_counter`;

  private constructor() {}

  public static getInstance(): MgbInvitationTrackingService {
    if (MgbInvitationTrackingService.instance === null) {
      MgbInvitationTrackingService.instance =
        new MgbInvitationTrackingService();
    }
    return MgbInvitationTrackingService.instance;
  }

  public async onInviteSuccess(inviterId: string, inviteeId: string) {
    const uniqueUserKey = `${this.INVITATION_UNIQUE_USER_KEY_PREFIX}:${inviterId}`;
    const milestoneReachedKey = `${this.INVITATION_MILESTONE_REACHED_KEY_PREFIX}:${inviterId}`;

    const criteria =
      MAGIC_BALL_CRITERIA[MAGIC_BALL_CRITERIA_TYPES.SuccessfullMicInvitation];
    const allMilestones = criteria.milestones;

    try {
      // 1. Check if all milestones are already covered
      const reachedMilestones =
        await this.redisService.getSetMembers<number>(milestoneReachedKey);

      if (reachedMilestones.length >= allMilestones.length) {
        return;
      }

      // 2. Keep track of unique users
      await this.redisService.addToSet(uniqueUserKey, inviteeId);
      const uniqueUserCount =
        await this.redisService.getSetCount(uniqueUserKey);

      // 3 & 4 & 5. Check for new milestones and reward
      for (const m of allMilestones) {
        // If count reached milestone AND we haven't rewarded it yet
        if (
          uniqueUserCount >= m.milestone &&
          !reachedMilestones.includes(m.milestone)
        ) {
          // Create dummy reward call
          await this.distributeReward(inviterId, m.rewardCoin);

          // Keep track that reward has been given
          await this.redisService.addToSet(milestoneReachedKey, m.milestone);

          console.log(
            `[MgbTracking] Milestone ${m.milestone} reached for user ${inviterId}. Awarded ${m.rewardCoin} coins.`,
          );
        }
      }
    } catch (error) {
      console.error(
        "Error in MgbInvitationTrackingService.onInviteSuccess:",
        error,
      );
    }
  }

  public async getInviterCurrentProgress(
    inviterId: string,
  ): Promise<IMgbInvitationProgress> {
    const uniqueUserKey = `${this.INVITATION_UNIQUE_USER_KEY_PREFIX}:${inviterId}`;
    const milestoneReachedKey = `${this.INVITATION_MILESTONE_REACHED_KEY_PREFIX}:${inviterId}`;

    const uniqueUserCount = await this.redisService.getSetCount(uniqueUserKey);
    const reachedMilestones =
      await this.redisService.getSetMembers<number>(milestoneReachedKey);

    const criteria =
      MAGIC_BALL_CRITERIA[MAGIC_BALL_CRITERIA_TYPES.SuccessfullMicInvitation];
    const allMilestones = criteria.milestones;

    return {
      uniqueUserCount,
      reachedMilestones,
      allMilestones,
    };
  }

  /**
   * Distribute reward function
   * @param userId The user receiving the reward
   * @param amount The amount of coins to award
   * @private
   */
  private async distributeReward(userId: string, amount: number) {
    // updating the coins to user profile
    await this.UserStatsRepository.updateCoins(userId, amount);
    // ? create notification for the reward
  }
}

interface IMgbInvitationProgress {
  uniqueUserCount: number;
  reachedMilestones: number[];
  allMilestones: {
    message: string;
    rewardCoin: number;
    milestone: number;
  }[];
}
