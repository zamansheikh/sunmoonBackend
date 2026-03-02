import GiftRecordModel from "../../models/gifts/gift_record_model";
import MyBucketModel from "../../models/store/my_bucket_model";
import StoreCategoryModel from "../../models/store/store_category_model";
import StoreItemModel from "../../models/store/store_item_model";
import User from "../../models/user/user_model";
import UserStats from "../../models/userstats/userstats_model";
import { GiftRecordRepository } from "../../repository/gifts/gift_record_repository";
import MyBucketRepository from "../../repository/store/my_bucket_repository";
import StoreCategoryRepository from "../../repository/store/store_category_repository";
import StoreItemRepository from "../../repository/store/store_item_repository";
import UserRepository from "../../repository/users/user_repository";
import UserStatsRepository from "../../repository/users/userstats_repository";

export class RepositoryProviders {
  static readonly giftRecordRepositoryProvider = new GiftRecordRepository(
    GiftRecordModel,
  );

  static readonly storeCategoryRepositoryProvider = new StoreCategoryRepository(
    StoreCategoryModel,
  );

  static readonly storeItemRepositoryProvider = new StoreItemRepository(
    StoreItemModel,
  );

  static readonly myBucketRepositoryProvider = new MyBucketRepository(
    MyBucketModel,
  );

  static readonly userRepositoryProvider = new UserRepository(User);

  static readonly userStatsRepositoryProvider = new UserStatsRepository(
    UserStats,
  );
}
