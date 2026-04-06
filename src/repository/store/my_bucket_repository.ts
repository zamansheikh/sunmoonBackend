import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import {
  IMyBucket,
  IMyBucketDocument,
  IMyBucketModel,
} from "../../models/store/my_bucket_model";
import mongoose, { ClientSession, UpdateResult } from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";

export interface IMyBucketRepository {
  createNewBucket(
    data: IMyBucket,
    session?: ClientSession,
  ): Promise<IMyBucketDocument>;
  getBucketsById(id: string): Promise<IMyBucketDocument | null>;
  getAllBuckets(
    ownerId: string,
    categoryId: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; buckets: IMyBucketDocument[] }>;
  updateBucket(
    id: string,
    data: Partial<IMyBucket>,
    session?: ClientSession,
  ): Promise<IMyBucketDocument>;
  deleteBucket(id: string): Promise<IMyBucketDocument>;
  updateBucketUseStatus(
    filter: Record<string, any>,
    update: Partial<IMyBucket>,
    session?: ClientSession,
  ): Promise<UpdateResult>;
  getEquippedBuckets(id: string): Promise<IMyBucketDocument[] | null>;
  getAllBucketItems(query: Record<string, any>): Promise<{
    pagination: IPagination;
    items: IMyBucketDocument[];
  }>;
  getAllPremiumItems(userId: string): Promise<IMyBucketDocument[]>;
  countUsersByItemId(itemId: string): Promise<number>;
  findBucketByOwnerAndItem(
    ownerId: string,
    itemId: string,
    session?: ClientSession,
  ): Promise<IMyBucketDocument | null>;
  getAllBucketsByOwner(
    ownerId: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; buckets: IMyBucketDocument[] }>;
  getAllBucketsByCategoryGrouped(
    ownerId: string,
  ): Promise<Record<string, IMyBucketDocument[]>>;
}

export default class MyBucketRepository implements IMyBucketRepository {
  Model: IMyBucketModel;
  constructor(model: IMyBucketModel) {
    this.Model = model;
  }

  async createNewBucket(
    data: IMyBucket,
    session?: ClientSession,
  ): Promise<IMyBucketDocument> {
    const bucket = new this.Model(data);
    return await bucket.save({ session });
  }

  async getBucketsById(id: string): Promise<IMyBucketDocument | null> {
    return await this.Model.findById(id);
  }

  async getAllBuckets(
    ownerId: string,
    categoryId: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; buckets: IMyBucketDocument[] }> {
    const qb = new QueryBuilder(this.Model, query);
    const res = qb
      .find({ categoryId: categoryId, ownerId: ownerId })
      .populateField("itemId categoryId")
      .sort()
      .paginate();
    const buckets = await res.exec();
    const pagination = await res.countTotal();
    return { pagination, buckets };
  }

  async updateBucket(
    id: string,
    data: Partial<IMyBucket>,
    session?: ClientSession,
  ): Promise<IMyBucketDocument> {
    const updated = await this.Model.findByIdAndUpdate(id, data, {
      new: true,
      session,
    }).populate("itemId categoryId");
    if (!updated)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Bucket with id ${id} not found`,
      );
    return updated;
  }

  async deleteBucket(id: string): Promise<IMyBucketDocument> {
    const deleted = await this.Model.findByIdAndDelete(id);
    if (!deleted)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `Bucket with id ${id} not found`,
      );
    return deleted;
  }

  async updateBucketUseStatus(
    filter: Record<string, any>,
    update: Partial<IMyBucket>,
    session?: ClientSession,
  ): Promise<UpdateResult> {
    return await this.Model.updateMany(filter, update, { session });
  }

  async getEquippedBuckets(id: string): Promise<IMyBucketDocument[] | null> {
    const equipped = await this.Model.find({
      ownerId: id,
      useStatus: true,
    }).populate("itemId categoryId");
    return equipped;
  }

  async getAllBucketItems(
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; items: IMyBucketDocument[] }> {
    const qb = new QueryBuilder(this.Model, query);
    const res = qb
      .find({})
      .populateField("itemId categoryId")
      .sort()
      .paginate();
    const items = await res.exec();
    const pagination = await res.countTotal();
    return { pagination, items };
  }

  async getAllPremiumItems(userId: string): Promise<IMyBucketDocument[]> {
    const premiumCategories = await mongoose
      .model(DatabaseNames.StoreCategory)
      .find({ isPremium: true });
    const categoryIds = premiumCategories.map((cat) => cat._id);

    return await this.Model.find({
      ownerId: userId,
      categoryId: { $in: categoryIds },
    }).populate("itemId categoryId");
  }

  async countUsersByItemId(itemId: string): Promise<number> {
    return await this.Model.countDocuments({ itemId: itemId });
  }

  async findBucketByOwnerAndItem(
    ownerId: string,
    itemId: string,
    session?: ClientSession,
  ): Promise<IMyBucketDocument | null> {
    return await this.Model.findOne({ ownerId, itemId }).session(
      session || null,
    );
  }

  async getAllBucketsByOwner(
    ownerId: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; buckets: IMyBucketDocument[] }> {
    const qb = new QueryBuilder(this.Model, query);
    const res = qb
      .find({ ownerId: ownerId })
      .populateField("itemId categoryId")
      .sort();
    const buckets = await res.exec();
    const pagination = await res.countTotal();
    return { pagination, buckets };
  }

  async getAllBucketsByCategoryGrouped(
    ownerId: string,
  ): Promise<Record<string, IMyBucketDocument[]>> {
    const results = await this.Model.db
      .collection(DatabaseNames.StoreCategory)
      .aggregate([
        {
          $lookup: {
            from: DatabaseNames.MyBucketItem,
            let: { categoryId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$categoryId", "$$categoryId"] },
                      {
                        $eq: ["$ownerId", new mongoose.Types.ObjectId(ownerId)],
                      },
                    ],
                  },
                },
              },
              {
                $lookup: {
                  from: DatabaseNames.StoreItem,
                  localField: "itemId",
                  foreignField: "_id",
                  as: "itemId",
                },
              },
              {
                $unwind: "$itemId",
              },
              {
                $lookup: {
                  from: DatabaseNames.StoreCategory,
                  localField: "categoryId",
                  foreignField: "_id",
                  as: "categoryId",
                },
              },
              {
                $unwind: "$categoryId",
              },
            ],
            as: "buckets",
          },
        },
        {
          $group: {
            _id: null,
            categories: {
              $push: {
                k: "$title",
                v: "$buckets",
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $arrayToObject: "$categories",
            },
          },
        },
      ])
      .toArray();

    return results[0] || {};
  }
}
