import MyBucketModel from "../../models/store/my_bucket_model";
import StoreCategoryModel from "../../models/store/store_category_model";
import { IStoreItem } from "../../models/store/store_item_model";
import User from "../../models/user/user_model";
import MyBucketRepository from "../../repository/store/my_bucket_repository";
import StoreCategoryRepository from "../../repository/store/store_category_repository";
import UserRepository from "../../repository/users/user_repository";
import SingletonSocketServer from "../sockets/singleton_socket_server";
import { AudioRoomChannels } from "../Utils/enums";
import { XpConfigService } from "../../services/admin/xp_config_service";
import MedalModel from "../../models/medal/medal_model";
import MedalRepository from "../../repository/medal/medal_repository";

export class XpHelper {
  private static instance: XpHelper;

  //   repositories
  public userRepository = new UserRepository(User);
  public bucketRepository = new MyBucketRepository(MyBucketModel);
  public storeCategoryRepository = new StoreCategoryRepository(
    StoreCategoryModel,
  );
  public medalRepository = new MedalRepository(MedalModel);

  private constructor() {}

  public static getInstance(): XpHelper {
    if (!XpHelper.instance) {
      XpHelper.instance = new XpHelper();
    }
    return XpHelper.instance;
  }

  public async updateUserXp(userId: string, xpAmount: number) {
    const user = await this.userRepository.findUserById(userId);
    if (!user) return;

    const config = await XpConfigService.getConfig();
    if (!config) {
      console.warn(`[XpHelper] updateUserXp skipped for user ${userId}: XP config not loaded`);
      return;
    }

    const level = this.determineUserLevelFromXp(
      user.totalEarnedXp + xpAmount,
      config.xpLevels,
    );
    const oldLevel = user.level || 0;
    if (level > oldLevel) {
      const socketInstance = SingletonSocketServer.getInstance();
      socketInstance.emitToUser(userId, AudioRoomChannels.LevelUp, { level });

      // Auto-award medals for each level the user progressed through
      for (let lvl = oldLevel + 1; lvl <= level; lvl++) {
        await this.awardMedalForLevel(user, lvl);
      }
    }
    user.totalEarnedXp += xpAmount;
    user.level = level;
    await user.save();
  }

  public async updateUserXpFromCoin(userId: string, coins: number) {
    const user = await this.userRepository.findUserById(userId);
    if (!user) return;

    const config = await XpConfigService.getConfig();
    if (!config) {
      console.warn(`[XpHelper] updateUserXpFromCoin skipped for user ${userId}: XP config not loaded`);
      return;
    }

    const xpAmount =
      (coins / config.giftSendXp) *
      (await this.calculateSvipMultiplier(userId, config.svipMultipliers));

    const level = this.determineUserLevelFromXp(
      user.totalEarnedXp + xpAmount,
      config.xpLevels,
    );
    const oldLevel = user.level || 0;
    if (level > oldLevel) {
      const socketInstance = SingletonSocketServer.getInstance();
      socketInstance.emitToUser(userId, AudioRoomChannels.LevelUp, { level });

      // Auto-award medals for each level the user progressed through
      for (let lvl = oldLevel + 1; lvl <= level; lvl++) {
        await this.awardMedalForLevel(user, lvl);
      }
    }
    user.totalEarnedXp += xpAmount;
    user.level = level;
    await user.save();
  }

  private async calculateSvipMultiplier(
    userId: string,
    svipMultipliers: { minLevel: number; multiplier: number }[],
  ): Promise<number> {
    const highestSvip = await this.getHighestSvipLevel(userId);
    const sorted = [...svipMultipliers].sort(
      (a, b) => b.minLevel - a.minLevel,
    );
    for (const tier of sorted) {
      if (highestSvip >= tier.minLevel) return tier.multiplier;
    }
    return 1.0;
  }

  public async getHighestSvipLevel(userId: string): Promise<number> {
    const svipPackages = (
      await this.bucketRepository.getAllPremiumItems(userId)
    )
      .filter((item) => item.itemId) // Ensure itemId is populated/not null
      .map((item) => (item.itemId as IStoreItem).name)
      .filter((name) => name.includes("SVIP"))
      .map((name) => parseInt(name.split("SVIP-")?.[1] || "0") || 0);

    const highestSvip =
      svipPackages.length === 0 ? 0 : Math.max(...svipPackages);
    return highestSvip;
  }

  private determineUserLevelFromXp(
    xpCount: number,
    xpLevels: number[],
  ): number {
    for (let i = 0; i < xpLevels.length; i++) {
      if (xpCount < xpLevels[i]) {
        return i; // Levels start from 0
      }
    }
    return xpLevels.length; // at maximum level
  }

  private async awardMedalForLevel(user: any, level: number): Promise<void> {
    try {
      const medal = await this.medalRepository.findByLevel(level);
      if (!medal) return;

      const alreadyEarned = (user.earnedMedals || []).some(
        (em: any) =>
          em.medalId?.toString() === medal._id?.toString(),
      );
      if (alreadyEarned) return;

      user.earnedMedals.push({
        medalId: medal._id,
        earnedAt: new Date(),
      });

      console.log(
        `[XpHelper] Awarded medal "${medal.name}" to user ${user._id} for reaching level ${level}`,
      );
    } catch (error: any) {
      console.error(
        `[XpHelper] Failed to award medal for level ${level}: ${error.message}`,
      );
    }
  }
}
