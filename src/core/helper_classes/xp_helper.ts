import MyBucketModel from "../../models/store/my_bucket_model";
import StoreCategoryModel from "../../models/store/store_category_model";
import { IStoreItem } from "../../models/store/store_item_model";
import User from "../../models/user/user_model";
import MyBucketRepository from "../../repository/store/my_bucket_repository";
import StoreCategoryRepository from "../../repository/store/store_category_repository";
import UserRepository from "../../repository/users/user_repository";
import { xpLevels } from "../Utils/constants";

export class XpHelper {
  private static instance: XpHelper;
  private readonly GIFT_SEND_XP = 600;

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

  public async updateUserXp(userId: string, coins: number) {
    const user = await this.userRepository.findUserById(userId);
    const xpAmount =
      (coins / this.GIFT_SEND_XP) *
      (await this.calculateSvipMultiplier(userId));
    const level = this.determineUserLevelFromXp(user!.totalEarnedXp + xpAmount);
    user!.totalEarnedXp += xpAmount;
    user!.level = level;
    await user!.save();
  }

  private async calculateSvipMultiplier(userId: string): Promise<number> {
    const svipPackages = (
      await this.bucketRepository.getAllPremiumItems(userId)
    )
      .map((item) => (item.itemId as IStoreItem).name)
      .filter((name) => name.includes("SVIP"))
      .map((name) => parseInt(name.split("SVIP-")[1]) || 0);
    const highestSvip =
      svipPackages.length == 0 ? 0 : Math.max(...svipPackages);
    if (highestSvip < 2) return 1;
    if (highestSvip < 7) return 1.2;
    if (highestSvip < 9) return 1.3;
    return 1.4;
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
