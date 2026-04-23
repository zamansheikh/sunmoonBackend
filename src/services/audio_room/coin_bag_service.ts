import { RepositoryProviders } from "../../core/providers/repository_providers";
import { ICoinBagOptionRepository } from "../../repository/audio_room/coin_bag_option_repository";
import { ICoinBagDistributionRepository } from "../../repository/audio_room/coin_bag_distribution_repository";
import { ICoinBagOptions } from "../../models/audio_room/coin_bag_option_model";
import { AudioRoomCache } from "../../core/cache/audio_room_cache";
import AppError from "../../core/errors/app_errors";
import mongoose from "mongoose";

interface ICoinBagSession {
  coinAmount: number;
  userCount: number;
  roomId: string;
  rewardStartTime: number;
  currIndex: number;
  senderId: string;
}

interface IClaimedCoinUser {
  rank: number;
  coinAmount: number;
  avatar: string;
  name: string;
  claimedAt: Date;
}

import { RedisFolderProvider } from "../../core/redis/redis_folder_provider";
import RedisService from "../../core/redis/redis_service";
import { AudioRoomChannels, UserActiveStatus } from "../../core/Utils/enums";
import { UserCache } from "../../core/cache/user_chache";
import { ICoinBagDistribution } from "../../models/audio_room/coin_bag_distribution_model";
import SingletonSocketServer from "../../core/sockets/singleton_socket_server";

export default class CoinBagService {
  private static instance: CoinBagService;
  private coinBagOptionRepository: ICoinBagOptionRepository;
  private coinBagDistributionRepository: ICoinBagDistributionRepository;
  private userStatsRepository = RepositoryProviders.userStatsRepositoryProvider;
  private redis = RedisService.getInstance();

  private readonly COIN_BAG_SERVICE_FOLDER =
    RedisFolderProvider.CoinBagServiceFolderPrefix;
  private readonly SESSION_KEY_PREFIX = `${this.COIN_BAG_SERVICE_FOLDER}:session:`;
  private readonly CLAIMED_COIN_USERS_KEY_PREFIX = `${this.COIN_BAG_SERVICE_FOLDER}:claimed_users:`;
  private readonly CLAIMED_SET_KEY_PREFIX = `${this.COIN_BAG_SERVICE_FOLDER}:claimed_set:`;
  private readonly RANK_KEY_PREFIX = `${this.COIN_BAG_SERVICE_FOLDER}:rank:`;

  // options and distributions created by admin
  private coinbagOptions: ICoinBagOptions | null = null;
  private coinbagDistributions: ICoinBagDistribution[] | null = null;
  private optionsLastFetched: number = 0;
  private distributionsLastFetched: number = 0;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private readonly COIN_BAG_TTL = 90; // 90 seconds

  private constructor() {
    this.coinBagOptionRepository =
      RepositoryProviders.coinBagOptionRepositoryProvider;
    this.coinBagDistributionRepository =
      RepositoryProviders.coinBagDistributionRepositoryProvider;
  }

  public static getInstance(): CoinBagService {
    if (!CoinBagService.instance) {
      CoinBagService.instance = new CoinBagService();
    }
    return CoinBagService.instance;
  }

  public async sendCoinBagToRoom(
    coinAmount: number,
    userCount: number,
    roomId: string,
    senderId: string,
  ) {
    // validate the roomId and senderId
    if (!AudioRoomCache.getInstance().validateRoomId(roomId)) {
      throw new AppError(404, "Room not found");
    }
    const userBrief = await UserCache.getInstance().getUserBrief(senderId);
    if (!userBrief)
      throw new AppError(404, "User not found, cannot send coin bag");
    // validate if the options are valid
    await this.validateCoinBagOptions(coinAmount, userCount);
    // validate the session
    const sessionKey = `${this.SESSION_KEY_PREFIX}${roomId}`;
    const session = await this.redis.get(sessionKey);
    if (session)
      throw new AppError(
        400,
        "Coin Bag is Already in Proggress, Please try again later ",
      );
    // start transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // deduct coin from the sender
      await this.userStatsRepository.balanceDeduction(
        senderId,
        coinAmount,
        dbSession,
      );

      // create a new session in redis
      const sessionData: ICoinBagSession = {
        coinAmount,
        userCount,
        roomId,
        rewardStartTime: Date.now() + 60 * 1000,
        currIndex: 0,
        senderId,
      };

      // Set redis session with 90 seconds TTL (atomic)
      await this.redis.set(sessionKey, sessionData, this.COIN_BAG_TTL);

      // commit transaction if everything is successful
      await dbSession.commitTransaction();

      SingletonSocketServer.getInstance().emitGlobalCoinBagBanner({
        roomId,
        coinAmount,
        senderPhoto: userBrief.avatar,
        senderName: userBrief.name,
      });

      // send room wide socket event
      SingletonSocketServer.getInstance().emitToAll(
        AudioRoomChannels.NewCoinBag,
        {
          rewardStartTime: sessionData.rewardStartTime,
        },
      );
      return { rewardStartTime: sessionData.rewardStartTime };
    } catch (error) {
      // abort transaction if any operation fails
      await dbSession.abortTransaction();
      throw error;
    } finally {
      // end session
      dbSession.endSession();
    }
  }

  public async getCoinBagStatus(roomId: string) {
    const sessionKey = `${this.SESSION_KEY_PREFIX}${roomId}`;
    const session = await this.redis.get<ICoinBagSession>(sessionKey);
    if (session) {
      return { rewardStartTime: session.rewardStartTime };
    }
    return { rewardStartTime: null };
  }

  public async claimCoinBag(roomId: string, userId: string) {
    // validate the roomId and userId
    if (!AudioRoomCache.getInstance().validateRoomId(roomId)) {
      throw new AppError(404, "Room not found");
    }
    const userBrief = await UserCache.getInstance().getUserBrief(userId);
    if (!userBrief) throw new AppError(404, "User not found");

    const sessionKey = `${this.SESSION_KEY_PREFIX}${roomId}`;
    const session = await this.redis.get<ICoinBagSession>(sessionKey);
    // check for session existance and the reward timing
    if (!session)
      throw new AppError(404, "Coin bag session does not exist or has expired");

    // Get remaining session TTL to sync auxiliary keys
    const remainingTTL = await this.redis.getTTL(sessionKey);

    // if (session.rewardStartTime > Date.now())
    //   throw new AppError(
    //     400,
    //     "The reward countdown is still active; please wait",
    //   );

    // Check if user already claimed using a Redis set for atomicity
    const claimedSetKey = `${this.CLAIMED_SET_KEY_PREFIX}${roomId}`;
    const addedCount = await this.redis.addToSet(claimedSetKey, userId);
    if (addedCount === 0) {
      throw new AppError(400, "You have already claimed this coin bag");
    }

    // Sync expiration with session
    if (remainingTTL > 0) {
      await this.redis.expire(claimedSetKey, remainingTTL);
    }

    try {
      const distribution = await this.resolveCoinBagDistributions();
      const matchedDistribution = distribution.find(
        (dist) => dist.totalUsers == session.userCount,
      );
      if (!matchedDistribution)
        throw new AppError(404, "Coin bag distribution not found");

      // Atomic rank increment to prevent race conditions
      const rankKey = `${this.RANK_KEY_PREFIX}${roomId}`;
      const userRank = (await this.redis.increment(rankKey)) - 1; // 0-indexed

      // Sync expiration with session
      if (remainingTTL > 0) {
        await this.redis.expire(rankKey, remainingTTL);
      }

      if (userRank >= session.userCount) {
        throw new AppError(
          400,
          "Better luck next time! All rewards have been claimed.",
        );
      }

      const coinPercentage =
        matchedDistribution.dataPoints[userRank].percentage;

      const coinAmount = Math.floor(
        session.coinAmount * (coinPercentage / 100),
      );

      // prepare claimed user data
      const claimedUserData: IClaimedCoinUser = {
        rank: userRank + 1, // 1-indexed for UX
        coinAmount,
        avatar: userBrief.avatar,
        name: userBrief.name,
        claimedAt: new Date(),
      };

      // add claimed user data to a Redis Sorted Set to maintain winner order
      const claimedUsersKey = `${this.CLAIMED_COIN_USERS_KEY_PREFIX}${roomId}`;
      await this.redis.addToSortedSet(
        claimedUsersKey,
        claimedUserData,
        claimedUserData.rank,
      );
      await this.redis.expire(claimedUsersKey, remainingTTL);

      // add the reward to the userstats
      await this.userStatsRepository.updateCoins(userId, coinAmount);

      return coinAmount;
    } catch (error) {
      // Rollback: If anything fails (like DB update), allow the user to try again
      await this.redis.removeFromSet(claimedSetKey, userId);
      throw error;
    }
  }

  public async getClaimedUsers(roomId: string) {
    // check session active status
    const sessionKey = `${this.SESSION_KEY_PREFIX}${roomId}`;
    const session = await this.redis.get<ICoinBagSession>(sessionKey);
    if (!session)
      throw new AppError(404, "Coin bag session does not exist or has expired");
    // if (session.rewardStartTime > Date.now()) {
    //   throw new AppError(400, "Coin bag session is not started yet");
    // }
    // Use getSortedSetRange to get all winners in order (0 to -1)
    const claimedUsersKey = `${this.CLAIMED_COIN_USERS_KEY_PREFIX}${roomId}`;
    const claimedUsers =
      await this.redis.getSortedSetRange<IClaimedCoinUser>(claimedUsersKey);

    // get sender brief
    const senderBrief = await UserCache.getInstance().getUserBrief(
      session.senderId,
    );
    return {
      sender: {
        name: senderBrief?.name,
        avatar: senderBrief?.avatar,
      },
      totalRecievedUsers: claimedUsers.length,
      totalRecievedAmount: claimedUsers.reduce(
        (acc, user) => acc + user.coinAmount,
        0,
      ),
      totalAllocatedUsers: session.userCount,
      totalAllocatedAmount: session.coinAmount,
      claimedUsers,
    };
  }

  private async validateCoinBagOptions(coinAmount: number, userCount: number) {
    const options = await this.resolveCoinBagOptions();
    if (!options.coinOptions.includes(coinAmount)) {
      throw new AppError(400, "Invalid coin amount choice");
    }
    if (!options.userCountOptions.includes(userCount)) {
      throw new AppError(400, "Invalid user count choice");
    }
  }

  private async resolveCoinBagOptions(): Promise<ICoinBagOptions> {
    const isCacheValid =
      this.coinbagOptions &&
      Date.now() - this.optionsLastFetched < this.CACHE_TTL;
    if (isCacheValid) {
      return this.coinbagOptions!;
    }
    this.coinbagOptions = await this.coinBagOptionRepository.get();
    this.optionsLastFetched = Date.now();
    return this.coinbagOptions!;
  }

  private async resolveCoinBagDistributions(): Promise<ICoinBagDistribution[]> {
    const isCacheValid =
      this.coinbagDistributions &&
      Date.now() - this.distributionsLastFetched < this.CACHE_TTL;
    if (isCacheValid) {
      return this.coinbagDistributions!;
    }
    this.coinbagDistributions =
      await this.coinBagDistributionRepository.getAll();
    this.distributionsLastFetched = Date.now();
    return this.coinbagDistributions!;
  }

  // for client user only
  public async getCoinBagOptions(): Promise<ICoinBagOptions> {
    return await this.resolveCoinBagOptions();
  }

  // for admin only
  public async createCoinBagOptions(
    data: ICoinBagOptions,
  ): Promise<ICoinBagOptions> {
    const result = await this.coinBagOptionRepository.create(data);
    this.coinbagOptions = null; // invalidate cache
    return result;
  }

  // for admin only
  public async updateCoinBagOptions(
    data: ICoinBagOptions,
  ): Promise<ICoinBagOptions | null> {
    const result = await this.coinBagOptionRepository.update(data);
    this.coinbagOptions = null; // invalidate cache
    return result;
  }
}
