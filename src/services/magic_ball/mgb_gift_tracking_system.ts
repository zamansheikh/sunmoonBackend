import { AudioRoomCache } from "../../core/cache/audio_room_cache";
import { RepositoryProviders } from "../../core/providers/repository_providers";
import { RedisFolderProvider } from "../../core/redis/redis_folder_provider";
import { RedisService } from "../../core/redis/redis_service";
import { MAGIC_BALL_CRITERIA } from "../../core/Utils/constants";
import { MAGIC_BALL_CRITERIA_TYPES } from "../../core/Utils/enums";

export class MgbGiftTrackingSystem {
  private static instance: MgbGiftTrackingSystem | null = null;

  // repository
  private readonly UserStatsRepository =
    RepositoryProviders.userStatsRepositoryProvider;

  // redis
  private readonly redisService = RedisService.getInstance();
  private readonly MGBTrackingFolder =
    RedisFolderProvider.MgbGiftTrackingSystemFolderPrefix;

  // Keys for SendGiftUniqueUser (Global)
  private readonly GLOBAL_UNIQUE_USER_KEY_PREFIX = `${this.MGBTrackingFolder}:global_unique_users`;
  private readonly GLOBAL_MILESTONE_REACHED_KEY_PREFIX = `${this.MGBTrackingFolder}:global_milestone_reached`;

  // Keys for SendGiftUniqueUserInRoom (Per Room)
  private readonly ROOM_UNIQUE_USER_KEY_PREFIX = `${this.MGBTrackingFolder}:room_unique_users`;
  private readonly ROOM_MILESTONE_REACHED_KEY_PREFIX = `${this.MGBTrackingFolder}:room_milestone_reached`;

  private constructor() {}

  public static getInstance(): MgbGiftTrackingSystem {
    if (MgbGiftTrackingSystem.instance === null) {
      MgbGiftTrackingSystem.instance = new MgbGiftTrackingSystem();
    }
    return MgbGiftTrackingSystem.instance;
  }

  /**
   * Called when a gift is sent. Updates both global and per-room trackers.
   */
  public async onGiftSent(
    senderId: string,
    receiverIds: string[],
    roomId?: string,
  ) {
    try {
      // Filtering out the sender from receiver list to ensure we only track gifts to other users
      const otherReceiverIds = receiverIds.filter((id) => id !== senderId);
      if (otherReceiverIds.length === 0) return;

      const tasks = [this.trackGlobalUniqueUsers(senderId, otherReceiverIds)];
      if (roomId) {
        const cachedRoomId =
          await AudioRoomCache.getInstance().getRoomIdByHostId(senderId);
        if (!cachedRoomId || cachedRoomId !== roomId) return;
        tasks.push(
          this.trackRoomUniqueUsers(senderId, otherReceiverIds, roomId),
        );
      }
      await Promise.all(tasks);
    } catch (error) {
      console.error("Error in MgbGiftTrackingSystem.onGiftSent:", error);
    }
  }

  /**
   * Tracks unique users globally (MAGIC_BALL_CRITERIA_TYPES.SendGiftUniqueUser)
   */
  private async trackGlobalUniqueUsers(
    senderId: string,
    receiverIds: string[],
  ) {
    const uniqueUserKey = `${this.GLOBAL_UNIQUE_USER_KEY_PREFIX}:${senderId}`;
    const milestoneReachedKey = `${this.GLOBAL_MILESTONE_REACHED_KEY_PREFIX}:${senderId}`;

    const criteria =
      MAGIC_BALL_CRITERIA[MAGIC_BALL_CRITERIA_TYPES.SendGiftUniqueUser];
    const allMilestones = criteria.milestones;

    // 1. Check if all milestones are already covered
    const reachedMilestones =
      await this.redisService.getSetMembers<number>(milestoneReachedKey);

    if (reachedMilestones.length >= allMilestones.length) {
      return;
    }

    // 2. Keep track of unique users
    await this.redisService.addToSet(uniqueUserKey, ...receiverIds);
    const uniqueUserCount = await this.redisService.getSetCount(uniqueUserKey);

    // 3. Check for new milestones and reward
    for (const m of allMilestones) {
      if (
        uniqueUserCount >= m.milestone &&
        !reachedMilestones.includes(m.milestone)
      ) {
        await this.distributeReward(senderId, m.rewardCoin);
        await this.redisService.addToSet(milestoneReachedKey, m.milestone);

        console.log(
          `[MgbGiftTracking] Global Milestone ${m.milestone} reached for user ${senderId}. Awarded ${m.rewardCoin} coins.`,
        );
      }
    }
  }

  /**
   * Tracks unique users in a specific room (MAGIC_BALL_CRITERIA_TYPES.SendGiftUniqueUserInRoom)
   */
  private async trackRoomUniqueUsers(
    senderId: string,
    receiverIds: string[],
    roomId: string,
  ) {
    const uniqueUserInRoomKey = `${this.ROOM_UNIQUE_USER_KEY_PREFIX}:${senderId}:${roomId}`;
    const milestoneReachedKey = `${this.ROOM_MILESTONE_REACHED_KEY_PREFIX}:${senderId}`;

    const criteria =
      MAGIC_BALL_CRITERIA[MAGIC_BALL_CRITERIA_TYPES.SendGiftUniqueUserInRoom];
    const allMilestones = criteria.milestones;

    // 1. Check if all milestones are already covered
    const reachedMilestones =
      await this.redisService.getSetMembers<number>(milestoneReachedKey);

    if (reachedMilestones.length >= allMilestones.length) {
      return;
    }

    // 2. Keep track of unique users in THIS room
    await this.redisService.addToSet(uniqueUserInRoomKey, ...receiverIds);
    const uniqueUserInRoomCount =
      await this.redisService.getSetCount(uniqueUserInRoomKey);

    // 3. Check for new milestones and reward
    for (const m of allMilestones) {
      if (
        uniqueUserInRoomCount >= m.milestone &&
        !reachedMilestones.includes(m.milestone)
      ) {
        await this.distributeReward(senderId, m.rewardCoin);
        await this.redisService.addToSet(milestoneReachedKey, m.milestone);

        console.log(
          `[MgbGiftTracking] Room Milestone ${m.milestone} reached for user ${senderId} in room ${roomId}. Awarded ${m.rewardCoin} coins.`,
        );
      }
    }
  }

  public async getGlobalGiftProgress(
    senderId: string,
  ): Promise<IMgbGiftProgress> {
    const uniqueUserKey = `${this.GLOBAL_UNIQUE_USER_KEY_PREFIX}:${senderId}`;
    const milestoneReachedKey = `${this.GLOBAL_MILESTONE_REACHED_KEY_PREFIX}:${senderId}`;

    const uniqueUserCount = await this.redisService.getSetCount(uniqueUserKey);
    const reachedMilestones =
      await this.redisService.getSetMembers<number>(milestoneReachedKey);

    const criteria =
      MAGIC_BALL_CRITERIA[MAGIC_BALL_CRITERIA_TYPES.SendGiftUniqueUser];
    const allMilestones = criteria.milestones;

    return {
      uniqueUserCount,
      reachedMilestones,
      allMilestones,
    };
  }

  public async getRoomGiftProgress(
    senderId: string,
    roomId: string,
  ): Promise<IMgbGiftProgress> {
    const uniqueUserInRoomKey = `${this.ROOM_UNIQUE_USER_KEY_PREFIX}:${senderId}:${roomId}`;
    const milestoneReachedKey = `${this.ROOM_MILESTONE_REACHED_KEY_PREFIX}:${senderId}`;

    const uniqueUserCount =
      await this.redisService.getSetCount(uniqueUserInRoomKey);
    const reachedMilestones =
      await this.redisService.getSetMembers<number>(milestoneReachedKey);

    const criteria =
      MAGIC_BALL_CRITERIA[MAGIC_BALL_CRITERIA_TYPES.SendGiftUniqueUserInRoom];
    const allMilestones = criteria.milestones;

    return {
      uniqueUserCount,
      reachedMilestones,
      allMilestones,
    };
  }

  private async distributeReward(userId: string, amount: number) {
    await this.UserStatsRepository.updateCoins(userId, amount);
  }
}

interface IMgbGiftProgress {
  uniqueUserCount: number;
  reachedMilestones: number[];
  allMilestones: {
    message: string;
    rewardCoin: number;
    milestone: number;
  }[];
}
