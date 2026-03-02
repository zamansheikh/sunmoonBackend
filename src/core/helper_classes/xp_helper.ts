import MyBucketModel from "../../models/store/my_bucket_model";
import StoreCategoryModel from "../../models/store/store_category_model";
import { IStoreItem } from "../../models/store/store_item_model";
import User from "../../models/user/user_model";
import MyBucketRepository from "../../repository/store/my_bucket_repository";
import StoreCategoryRepository from "../../repository/store/store_category_repository";
import UserRepository from "../../repository/users/user_repository";
import SingletonSocketServer from "../sockets/singleton_socket_server";
import { xpLevels } from "../Utils/constants";
import { AudioRoomChannels } from "../Utils/enums";

export class XpHelper {
  private static instance: XpHelper;
  private readonly GIFT_SEND_XP = 600;
  private readonly MULTIPLIER_CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private svipMultiplierCache = new Map<
    string,
    { value: number; expiry: number }
  >();

  //   repositories
  public userRepository = new UserRepository(User);
  public bucketRepository = new MyBucketRepository(MyBucketModel);
  public storeCategoryRepository = new StoreCategoryRepository(
    StoreCategoryModel,
  );

  private constructor() {}

  public static getInstance(): XpHelper {
    if (!XpHelper.instance) {
      XpHelper.instance = new XpHelper();
    }
    return XpHelper.instance;
  }

  public async updateUserXp(userId: string, xpAmount: number) {
    const user = await this.userRepository.findUserById(userId);
    const level = this.determineUserLevelFromXp(user!.totalEarnedXp + xpAmount);
    if (level > user!.level!) {
      const socketInstance = SingletonSocketServer.getInstance();
      socketInstance.emitToUser(userId, AudioRoomChannels.LevelUp, { level });
    }
    user!.totalEarnedXp += xpAmount;
    user!.level = level;
    await user!.save();
  } 

  public async updateUserXpFromCoin(userId: string, coins: number) {
    const user = await this.userRepository.findUserById(userId);
    const xpAmount =
      (coins / this.GIFT_SEND_XP) *
      (await this.calculateSvipMultiplier(userId));
    const level = this.determineUserLevelFromXp(user!.totalEarnedXp + xpAmount);
    if (level > user!.level!) {
      const socketInstance = SingletonSocketServer.getInstance();
      socketInstance.emitToUser(userId, AudioRoomChannels.LevelUp, { level });
    }
    user!.totalEarnedXp += xpAmount;
    user!.level = level;
    await user!.save();
  }

  private async calculateSvipMultiplier(userId: string): Promise<number> {
    const cached = this.svipMultiplierCache.get(userId);
    if (cached && cached.expiry > Date.now()) return cached.value;

    const svipPackages = (
      await this.bucketRepository.getAllPremiumItems(userId)
    )
      .map((item) => (item.itemId as IStoreItem).name)
      .filter((name) => name.includes("SVIP"))
      .map((name) => parseInt(name.split("SVIP-")[1]) || 0);

    const highestSvip =
      svipPackages.length === 0 ? 0 : Math.max(...svipPackages);

    let multiplier = 1;

    if (highestSvip >= 9) multiplier = 1.4;
    else if (highestSvip >= 7) multiplier = 1.3;
    else if (highestSvip >= 2) multiplier = 1.2;

    this.svipMultiplierCache.set(userId, {
      value: multiplier,
      expiry: Date.now() + this.MULTIPLIER_CACHE_TTL,
    });

    return multiplier;
  }

  private determineUserLevelFromXp(xpCount: number): number {
    for (let i = 0; i < xpLevels.length; i++) {
      if (xpCount < xpLevels[i]) {
        return i; // Levels start from 0
      }
    }
    return 52; // at maximum level
  }
}
