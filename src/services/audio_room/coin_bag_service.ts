import { RepositoryProviders } from "../../core/providers/repository_providers";
import { ICoinBagOptionRepository } from "../../repository/audio_room/coin_bag_option_repository";
import { ICoinBagOptions } from "../../models/audio_room/coin_bag_option_model";
import { AudioRoomCache } from "../../core/cache/audio_room_cache";
import AppError from "../../core/errors/app_errors";

interface ICoinBagSession {
  coinAmount: number;
  userCount: number;
  roomId: string;
  rewardStartTime: number;
  currIndex: number;
}
import { RedisFolderProvider } from "../../core/redis/redis_folder_provider";
import RedisService from "../../core/redis/redis_service";
import { UserActiveStatus } from "../../core/Utils/enums";
import { UserCache } from "../../core/cache/user_chache";

export default class CoinBagService {
  private static instance: CoinBagService;
  private coinBagOptionRepository: ICoinBagOptionRepository;
  private userStatsRepository = RepositoryProviders.userStatsRepositoryProvider;
  private redis = RedisService.getInstance();

  private readonly COIN_BAG_SERVICE_FOLDER =
    RedisFolderProvider.CoinBagServiceFolderPrefix;
  private readonly SESSION_KEY_PREFIX = `${this.COIN_BAG_SERVICE_FOLDER}:session:`;

  private constructor() {
    this.coinBagOptionRepository =
      RepositoryProviders.coinBagOptionRepositoryProvider;
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
  ) {
    // validate the roomId
    if (!AudioRoomCache.getInstance().validateRoomId(roomId)) {
      throw new AppError(404, "Room not found");
    }
    // validate the session
    const sessionKey = `${this.SESSION_KEY_PREFIX}:${roomId}`;
    const session = await this.redis.get(sessionKey);
    if (session)
      throw new AppError(
        400,
        "Coin Bag is Already in Proggress, Please try again later ",
      );
    // create a new session in redis
    const sessionData: ICoinBagSession = {
      coinAmount,
      userCount,
      roomId,
      rewardStartTime: Date.now() + 60 * 1000,
      currIndex: 0,
    };
    await this.redis.set(sessionKey, JSON.stringify(sessionData));
    // set the expiry time for the session
    await this.redis.expire(sessionKey, 90);

    // ! send a global banner
  }

  public async getCoinBagStatus(roomId: string) {
    const sessionKey = `${this.SESSION_KEY_PREFIX}:${roomId}`;
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
    if (!UserCache.getInstance().validateUserId(userId)) {
      throw new AppError(404, "User not found");
    }

    const sessionKey = `${this.SESSION_KEY_PREFIX}:${roomId}`;
    const session = await this.redis.get<ICoinBagSession>(sessionKey);
    // check for session existance and the reward timing
    if (!session || session.rewardStartTime > Date.now())
      throw new AppError(404, "No active Coin Bag in this room");
  }

  // for client user only
  public async getCoinBagOptions(): Promise<ICoinBagOptions> {
    return await this.coinBagOptionRepository.get();
  }

  // for admin only
  public async createCoinBagOptions(
    data: ICoinBagOptions,
  ): Promise<ICoinBagOptions> {
    return await this.coinBagOptionRepository.create(data);
  }

  // for admin only
  public async updateCoinBagOptions(
    data: ICoinBagOptions,
  ): Promise<ICoinBagOptions | null> {
    return await this.coinBagOptionRepository.update(data);
  }
}
