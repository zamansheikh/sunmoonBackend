import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IStoreCategoryDocument } from "../../models/store/store_category_model";
import { IStoreCategoryRepository } from "../../repository/store/store_category_repository";
import {
  IBundle,
  IStoreItem,
  IStoreItemDocument,
} from "../../models/store/store_item_model";
import { IPagination } from "../../core/Utils/query_builder";
import StoreItemRepository, {
  IStoreItemRepository,
} from "../../repository/store/store_item_repository";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../../core/Utils/upload_file_cloudinary";
import { profile } from "console";
import { IUserRepository } from "../../repository/users/user_repository";
import { IMyBucketRepository } from "../../repository/store/my_bucket_repository";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import mongoose, { mongo } from "mongoose";
import { IMyBucketDocument } from "../../models/store/my_bucket_model";
import {
  deleteLocalFile,
  saveFileToLocal,
} from "../../core/Utils/save_file_to_local_sys";

export interface IPremiumFiles {
  categoryName: string;
  svgaFile: Express.Multer.File;
  previewFile: Express.Multer.File;
}

export interface IStoreService {
  // 📌 store categories
  createCategory(
    title: string,
  ): Promise<IStoreCategoryDocument>;
  getCategoryById(id: string): Promise<IStoreCategoryDocument>;
  getAllCategories(): Promise<IStoreCategoryDocument[]>;
  updateCategory(id: string, title: string): Promise<IStoreCategoryDocument>;
  deleteCategory(id: string): Promise<IStoreCategoryDocument>;
  categoryDeleteEffectedItems(id: string): Promise<{
    categoryItemCount: number;
    categoryItemNames: string[];
    premiumItemCount: number;
    premiumItems: string[];
  }>;
  // 📌 store items
  createStoreItemSingle(
    item: IStoreItem,
    svgaFile: Express.Multer.File,
    previewFile: Express.Multer.File,
  ): Promise<IStoreItemDocument>;
  createStoreItemBatch(
    item: IStoreItem,
    files: IPremiumFiles[],
  ): Promise<IStoreItemDocument>;
  getStoreItemById(id: string): Promise<IStoreItemDocument>;
  getVIPStoreItems(): Promise<IStoreItemDocument[]>;
  getSVIPStoreItems(): Promise<IStoreItemDocument[]>;
  getAllStoreItems(): Promise<Record<string, IStoreItemDocument[]>>;
  getStoreItemsByCategory(
    category: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; items: IStoreItemDocument[] }>;
  updateStoreItemSingle(
    id: string,
    item: Partial<IStoreItem>,
    svgaFile?: Express.Multer.File,
    previewFile?: Express.Multer.File,
  ): Promise<IStoreItemDocument>;
  updateStoreItemBatch(
    id: string,
    item: Partial<IStoreItem>,
    files?: IPremiumFiles[],
  ): Promise<IStoreItemDocument>;
  deleteStoreItem(id: string): Promise<IStoreItemDocument>;
  changeItemCategory(
    itemId: string,
    newCategory: string,
  ): Promise<IStoreItemDocument>;
  getEffectedBucketSummary(itemId: string): Promise<{
    itemName: string;
    userCount: number;
  }>;
  // 📌 my buckets
  buyStoreItem(
    ownerId: string,
    itemId: string,
    priceIndex?: number,
  ): Promise<IStoreItemDocument>;
  getMyBucket(
    ownerId: string,
    category: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; buckets: IMyBucketDocument[] }>;
  userGiftItem(ownerId: string, bucketId: string): Promise<IMyBucketDocument>;
}

export default class StoreService implements IStoreService {
  CategoryRepository: IStoreCategoryRepository;
  ItemRepository: IStoreItemRepository;
  UserRepository: IUserRepository;
  userStatsRepository: IUserStatsRepository;
  BucketRepository: IMyBucketRepository;
  constructor(
    categoryRepository: IStoreCategoryRepository,
    itemRepository: IStoreItemRepository,
    userRepository: IUserRepository,
    userStatsRepository: IUserStatsRepository,
    bucketRepository: IMyBucketRepository,
  ) {
    this.CategoryRepository = categoryRepository;
    this.ItemRepository = itemRepository;
    this.UserRepository = userRepository;
    this.userStatsRepository = userStatsRepository;
    this.BucketRepository = bucketRepository;
  }

  //  📌 store categories
  async createCategory(
    title: string,
  ): Promise<IStoreCategoryDocument> {
    const calculatedPremium = title === "VIP" || title === "SVIP";
    return await this.CategoryRepository.createCategory(
      title,
      calculatedPremium,
    );
  }

  async getCategoryById(id: string): Promise<IStoreCategoryDocument> {
    const category = await this.CategoryRepository.getCategoryById(id);
    if (!category) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Category with id ${id} not found`,
      );
    }
    return category;
  }

  async getAllCategories(): Promise<IStoreCategoryDocument[]> {
    return await this.CategoryRepository.getAllCategories();
  }

  async updateCategory(
    id: string,
    title: string,
  ): Promise<IStoreCategoryDocument> {
    const category = await this.CategoryRepository.getCategoryById(id);
    if (!category)
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    if (category.title === title) return category;
    await this.ItemRepository.updateBundleCategoryTitle(category.title, title);
    const updated = await this.CategoryRepository.updateCategory(id, title);
    return updated;
  }

  async categoryDeleteEffectedItems(id: string): Promise<{
    categoryItemCount: number;
    categoryItemNames: string[];
    premiumItemCount: number;
    premiumItems: string[];
  }> {
    const category = await this.CategoryRepository.getCategoryById(id);
    if (!category)
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    const normalItems = await this.ItemRepository.getAllStoreItemByCategory(id);
    const premiumItems =
      await this.ItemRepository.getStoreItemsByBundleCategoryName(
        category.title,
      );
    return {
      categoryItemCount: normalItems.length,
      categoryItemNames: normalItems.map((item) => item.name),
      premiumItemCount: premiumItems.length,
      premiumItems: premiumItems.map((item) => item.name),
    };
  }

  async deleteCategory(id: string): Promise<IStoreCategoryDocument> {
    const existingCategory = await this.CategoryRepository.getCategoryById(id);
    if (!existingCategory)
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    // deleting the items being effected
    await this.ItemRepository.deleteByCategory(id);
    await this.ItemRepository.deleteByBundleCategoryName(
      existingCategory.title,
    );
    return await this.CategoryRepository.deleteCategory(id);
  }

  // 📌 store items
  async createStoreItemSingle(
    item: IStoreItem,
    svgaFile: Express.Multer.File,
    previewFile: Express.Multer.File,
  ): Promise<IStoreItemDocument> {
    const category = await this.CategoryRepository.getCategoryById(
      item.categoryId.toString(),
    );
    if (!category)
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    if (category.isPremium)
      throw new AppError(StatusCodes.BAD_REQUEST, "This is a premium category");
    const svgaUrl = await saveFileToLocal(svgaFile, {
      folder: "store_items",
    });
    const previewUrl = await saveFileToLocal(previewFile, {
      folder: "store_items",
    });
    let itemToCreate: IStoreItem = {
      name: item.name,
      categoryId: item.categoryId,
      isPremium: false,
      prices: item.prices,
      svgaFile: svgaUrl,
      previewFile: previewUrl,
    };
    return await this.ItemRepository.createStoreItem(itemToCreate);
  }

  async createStoreItemBatch(
    item: IStoreItem,
    files: IPremiumFiles[],
  ): Promise<IStoreItemDocument> {
    // chhecking category validity
    const exisitngCategory = await this.CategoryRepository.getCategoryById(
      item.categoryId.toString(),
    );

    if (!exisitngCategory)
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    if (!exisitngCategory.isPremium)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "This is not a premium category",
      );

    // checking category name validity
    for (let i = 0; i < files.length; i++) {
      const fileSize = files[i].svgaFile.size;
      const extension = files[i].svgaFile.originalname.split(".").pop();
      const categoryName = files[i].categoryName;
      const isValidCategory =
        await this.CategoryRepository.isValidCategory(categoryName);
      // if (fileSize > 10485760)
      //   throw new AppError(
      //     StatusCodes.BAD_REQUEST,
      //     `${files[i].categoryName} is too large`
      //   );
      if (!extension)
        throw new AppError(StatusCodes.BAD_REQUEST, "Invalid file format");
      if (!isValidCategory)
        throw new AppError(
          StatusCodes.NOT_FOUND,
          `category -> ${categoryName} is not valid name`,
        );
    }
    // to upload and get the links
    let premimumURLs: IBundle[] = [];
    for (let i = 0; i < files.length; i++) {
      const extension = files[i].svgaFile.originalname.split(".").pop();
      const svgaUrl = await saveFileToLocal(files[i].svgaFile, {
        folder: "store_items",
      });
      const previewUrl = await saveFileToLocal(files[i].previewFile, {
        folder: "store_items",
      });
      premimumURLs.push({
        categoryName: files[i].categoryName,
        svgaFile: svgaUrl,
        previewFile: previewUrl,
        fileType: extension ?? "",
      });
    }
    let itemToCreate: IStoreItem = {
      name: item.name,
      categoryId: item.categoryId,
      isPremium: true,
      prices: item.prices,
      bundleFiles: premimumURLs,
      privilege: item.privilege,
    };
    return await this.ItemRepository.createStoreItem(itemToCreate);
  }

  async getStoreItemById(id: string): Promise<IStoreItemDocument> {
    const item = await this.ItemRepository.getStoreItemById(id);
    if (!item)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`,
      );
    return item;
  }

  async getAllStoreItems(): Promise<Record<string, IStoreItemDocument[]>> {
    return await this.ItemRepository.getAllStoreItemsByCategoryGrouped();
  }

  async getVIPStoreItems(): Promise<IStoreItemDocument[]> {
    const category = await this.CategoryRepository.getCategoryByTitle("VIP");
    if (!category) return [];
    return await this.ItemRepository.getAllStoreItemByCategory(
      (category as any)._id.toString(),
    );
  }

  async getSVIPStoreItems(): Promise<IStoreItemDocument[]> {
    const category = await this.CategoryRepository.getCategoryByTitle("SVIP");
    if (!category) return [];
    return await this.ItemRepository.getAllStoreItemByCategory(
      (category as any)._id.toString(),
    );
  }

  async getStoreItemsByCategory(
    category: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; items: IStoreItemDocument[] }> {
    return await this.ItemRepository.getAllStoreItems(category, query);
  }

  async updateStoreItemSingle(
    id: string,
    item: Partial<IStoreItem>,
    svgaFile?: Express.Multer.File,
    previewFile?: Express.Multer.File,
  ): Promise<IStoreItemDocument> {
    const existingItem = await this.ItemRepository.getStoreItemById(id);
    if (!existingItem)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`,
      );
    if (existingItem.isPremium)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "This api is not for premium items",
      );

    if (svgaFile) {
      // deleting the previous file
      const deleteStatus = await deleteLocalFile(existingItem.svgaFile!);
      if (!deleteStatus)
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to delete file",
        );
      const url = await saveFileToLocal(svgaFile, {
        folder: "store_items",
      });
      item.svgaFile = url;
    }

    if (previewFile) {
      // deleting the previous file
      if (existingItem.previewFile) {
        await deleteLocalFile(existingItem.previewFile);
      }
      const url = await saveFileToLocal(previewFile, {
        folder: "store_items",
      });
      item.previewFile = url;
    }

    return await this.ItemRepository.updateStoreItem(id, item);
  }

  async updateStoreItemBatch(
    id: string,
    item: Partial<IStoreItem>,
    files?: IPremiumFiles[],
  ): Promise<IStoreItemDocument> {
    let existingItem = await this.ItemRepository.getStoreItemById(id);
    if (!existingItem)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`,
      );
    if (!existingItem.isPremium)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "This api is not for single items",
      );

    let urlsBeDeleted = [];

    for (let i = 0; i < existingItem.bundleFiles!.length; i++) {
      for (let j = 0; j < files!.length; j++) {
        if (
          existingItem.bundleFiles![i].categoryName.toString() ==
          files![j].categoryName
        ) {
          urlsBeDeleted.push(existingItem.bundleFiles![i].svgaFile);
          urlsBeDeleted.push(existingItem.bundleFiles![i].previewFile);
          existingItem.bundleFiles = existingItem.bundleFiles?.filter(
            (f) => f.categoryName !== files![j].categoryName,
          );
        }
      }
    }

    for (let i = 0; i < urlsBeDeleted.length; i++) {
      const deleteFile = await deleteLocalFile(urlsBeDeleted[i]);
      if (!deleteFile) {
        console.error(`Failed to delete file: ${urlsBeDeleted[i]}`);
        continue;
      }
    }

    let newFilesToBeAdded: IBundle[] = [];

    for (let i = 0; i < files!.length; i++) {
      const extenstion = files![i].svgaFile.originalname.split(".").pop();
      let svgaUrl = await saveFileToLocal(files![i].svgaFile, {
        folder: "store_items",
      });
      let previewUrl = await saveFileToLocal(files![i].previewFile, {
        folder: "store_items",
      });
      newFilesToBeAdded.push({
        categoryName: files![i].categoryName,
        svgaFile: svgaUrl,
        previewFile: previewUrl,
        fileType: extenstion ?? "",
      });
    }

    let profileToBeUpdated: IStoreItem = {
      name: item.name || existingItem.name,
      categoryId: item.categoryId || existingItem.categoryId,
      isPremium: true,
      prices: item.prices || existingItem.prices,
      bundleFiles: [...existingItem.bundleFiles!, ...newFilesToBeAdded],
      privilege: item.privilege || existingItem.privilege,
    };

    const updated = await this.ItemRepository.updateStoreItem(
      id,
      profileToBeUpdated,
    );
    return updated;
  }

  async getEffectedBucketSummary(itemId: string) {
    const item = await this.ItemRepository.getStoreItemById(itemId);
    if (!item)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${itemId} not found`,
      );
    const userCount = await this.BucketRepository.countUsersByItemId(itemId);
    return {
      itemName: item.name,
      userCount: userCount,
    };
  }

  async deleteStoreItem(id: string): Promise<IStoreItemDocument> {
    const existingItem = await this.ItemRepository.getStoreItemById(id);
    if (!existingItem)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Store item with id ${id} not found`,
      );

    // cleaning files
    if (existingItem.svgaFile) await deleteLocalFile(existingItem.svgaFile);
    if (existingItem.previewFile)
      await deleteLocalFile(existingItem.previewFile);

    if (existingItem.bundleFiles) {
      for (const bundle of existingItem.bundleFiles) {
        await deleteLocalFile(bundle.svgaFile);
        await deleteLocalFile(bundle.previewFile);
      }
    }

    // if this items has been used by some users, we need to deselect them
    await this.BucketRepository.updateBucketUseStatus(
      { itemId: id, useStatus: true },
      { useStatus: false },
    );

    return await this.ItemRepository.deleteStoreItemHard(id);
  }

  async changeItemCategory(
    itemId: string,
    newCategory: string,
  ): Promise<IStoreItemDocument> {
    return await this.ItemRepository.updateStoreItem(itemId, {
      categoryId: newCategory,
    });
  }

  // 📌 my buckets
  async buyStoreItem(
    ownerId: string,
    itemId: string,
    priceIndex: number = 0,
  ): Promise<IStoreItemDocument> {
    const [user, stats, item] = await Promise.all([
      this.UserRepository.findUserById(ownerId),
      this.userStatsRepository.getUserStats(ownerId),
      this.ItemRepository.getStoreItemById(itemId),
    ]);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    if (!stats)
      throw new AppError(StatusCodes.NOT_FOUND, "User stats not found");
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Item not found");

    if (!item.prices || item.prices.length === 0)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Item has no pricing options",
      );
    if (priceIndex < 0 || priceIndex >= item.prices.length)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Invalid price option selected",
      );

    const selectedPrice = item.prices[priceIndex];

    if (selectedPrice.price > stats.coins!)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `for item price ${selectedPrice.price} having ${stats.coins} coins is not enough`,
      );

    // starting transaction

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Parallelize update operations and lookup within transaction
      const [_, __, existingBucket] = await Promise.all([
        this.userStatsRepository.updateCoins(
          ownerId,
          -selectedPrice.price,
          session,
        ),
        this.ItemRepository.updateSoldCount(itemId, session),
        // check if the user already owns this item
        this.BucketRepository.findBucketByOwnerAndItem(
          ownerId,
          item._id as string,
          session,
        ),
      ]);

      const newExpiry = new Date(
        Date.now() + selectedPrice.validity * 24 * 60 * 60 * 1000,
      );

      if (existingBucket) {
        await this.BucketRepository.updateBucket(
          existingBucket._id as string,
          { expireAt: newExpiry },
          session,
        );
      } else {
        await this.BucketRepository.createNewBucket(
          {
            itemId: item._id as string,
            ownerId: ownerId,
            categoryId: item.categoryId,
            expireAt: newExpiry,
          },
          session,
        );
      }
      await session.commitTransaction();
      return item;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getMyBucket(
    ownerId: string,
    category: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; buckets: IMyBucketDocument[] }> {
    const owener = await this.UserRepository.findUserById(ownerId);
    if (!owener) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    const existingCategory =
      await this.CategoryRepository.getCategoryById(category);
    if (!existingCategory)
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    return await this.BucketRepository.getAllBuckets(ownerId, category, query);
  }

  async userGiftItem(
    ownerId: string,
    bucketId: string,
  ): Promise<IMyBucketDocument> {
    const owner = await this.UserRepository.findUserById(ownerId);
    const bucket = await this.BucketRepository.getBucketsById(bucketId);
    if (!owner) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    if (!bucket) throw new AppError(StatusCodes.NOT_FOUND, "Bucket not found");
    if (bucket.ownerId.toString() != ownerId)
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "You are not the owner of this bucket",
      );
    if (bucket.useStatus) {
      const updated = await this.BucketRepository.updateBucket(bucketId, {
        useStatus: false,
      });
      return updated;
    }
    const item = await this.ItemRepository.getStoreItemById(
      bucket.itemId.toString(),
    );
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Item not found");
    const premiumCategory =
      await this.CategoryRepository.getCategoryConditionally({
        isPremium: true,
      });

    // start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (item.isPremium) {
        // deselecting all the items
        await this.BucketRepository.updateBucketUseStatus(
          { ownerId: ownerId, useStatus: true },
          { useStatus: false },
          session,
        );
      } else {
        // deselect premium items
        if (premiumCategory)
          await this.BucketRepository.updateBucketUseStatus(
            {
              ownerId: ownerId,
              useStatus: true,
              categoryId: premiumCategory!._id,
            },
            { useStatus: false },
            session,
          );
        // deselecting all the items in a single category
        await this.BucketRepository.updateBucketUseStatus(
          { ownerId: ownerId, useStatus: true, categoryId: bucket.categoryId },
          { useStatus: false },
          session,
        );
      }
      const updated = await this.BucketRepository.updateBucket(bucketId, {
        useStatus: true,
      });
      await session.commitTransaction();
      return updated;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
