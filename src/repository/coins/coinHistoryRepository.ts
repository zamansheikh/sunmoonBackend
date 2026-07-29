import { ClientSession, Types } from "mongoose";
import { DatabaseNames, UserRoles } from "../../core/Utils/enums";
import { IPagination, QueryBuilder } from "../../core/Utils/query_builder";
import {
  ICoinHistory,
  ICoinHistoryDocument,
  ICoinHistoryModel,
} from "../../models/coins/coinHistoryModel";
import User from "../../models/user/user_model";

export interface ICoinHistoryRepository {
  createHistory(
    data: ICoinHistory,
    session?: ClientSession
  ): Promise<ICoinHistoryDocument>;
  getAdminHistories(
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: ICoinHistoryDocument[] }>;
  getPortalHistory(
    senderId: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: ICoinHistoryDocument[] }>;
  getResellerHistories(
    senderId: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: ICoinHistoryDocument[] }>;
}

export default class CoinHistoryRepository implements ICoinHistoryRepository {
  Model: ICoinHistoryModel;
  constructor(model: ICoinHistoryModel) {
    this.Model = model;
  }

  async createHistory(
    data: ICoinHistory,
    session?: ClientSession
  ): Promise<ICoinHistoryDocument> {
    const history = new this.Model(data);
    return await history.save({ session });
  }

  async getAdminHistories(
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: ICoinHistoryDocument[] }> {
    const qb = new QueryBuilder(this.Model, query);
    const res = qb.aggregate([
      {
        $match: {
          senderRole: UserRoles.Admin,
        },
      },
      {
        $lookup: {
          from: DatabaseNames.PortalUsers,
          localField: "receiverId",
          foreignField: "_id",
          as: "receiver",
        },
      },
      {
        $unwind: "$receiver",
      },
    ]);

    const data = await res.sort().exec();
    const pagination = await res.countTotal();
    return {
      pagination,
      data,
    };
  }

  async getPortalHistory(
    senderId: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: ICoinHistoryDocument[] }> {
    const sender = new Types.ObjectId(senderId);
    const qb = new QueryBuilder(this.Model, query);
    const res = qb.aggregate([
      {
        $match: {
          senderId: sender,
        },
      },
      {
        $lookup: {
          from: DatabaseNames.User,
          foreignField: "_id",
          localField: "receiverId",
          as: "userInfo",
        },
      },
      {
        $lookup: {
          from: DatabaseNames.PortalUsers,
          foreignField: "_id",
          localField: "receiverId",
          as: "portalUserInfo",
        },
      },
      {
        $unwind: {
          path: "$userInfo", 
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$portalUserInfo", 
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          senderId: 1,
          senderRole: 1,
          receiverRole: 1,
          amount: 1,
          createdAt: 1,
          portalUserInfo: {
            _id: 1,
            name: 1,
            userId: 1,
            coins: 1,
            designation: 1,
          },
          userInfo: {
            _id: 1,
            name: 1,
            email: 1,
            uid: 1,
            userRole: 1,
            avatar: 1,
            level: 1,
          }
        }
      }
    ]);

    const data = await res.sort().exec();
    const pagination = await res.countTotal();
    return {
      pagination,
      data,
    };
  }

  async getResellerHistories(
    senderId: string,
    query: Record<string, any>
  ): Promise<{ pagination: IPagination; data: ICoinHistoryDocument[] }> {
    const sender = new Types.ObjectId(senderId);
    const { name, userId, minCoins, maxCoins, from, to } = query;

    const baseMatch: Record<string, any> = {
      senderId: sender,
      senderRole: UserRoles.Reseller,
    };

    if (userId) {
      const user = await User.findOne({ userId: Number(userId) }).select("_id").lean();
      if (!user) {
        return {
          pagination: { total: 0, limit: Number(query?.limit || 10), page: Number(query?.page || 1), totalPage: 0 },
          data: [],
        };
      }
      baseMatch.receiverId = user._id;
    }

    if (minCoins || maxCoins) {
      baseMatch.amount = {};
      if (minCoins) baseMatch.amount.$gte = Number(minCoins);
      if (maxCoins) baseMatch.amount.$lte = Number(maxCoins);
    }

    if (from || to) {
      baseMatch.createdAt = {};
      if (from) baseMatch.createdAt.$gte = new Date(from as string);
      if (to) baseMatch.createdAt.$lte = new Date(to as string);
    }

    const lookupStage: any = {
      $lookup: {
        from: DatabaseNames.User,
        foreignField: "_id",
        localField: "receiverId",
        as: "receiverInfo",
      },
    };

    const unwindStage: any = {
      $unwind: {
        path: "$receiverInfo",
        preserveNullAndEmptyArrays: true,
      },
    };

    const nameMatch: any[] = name
      ? [{ $match: { "receiverInfo.name": { $regex: name, $options: "i" } } }]
      : [];

    const limit = Number(query?.limit || 10);
    const page = Number(query?.page || 1);
    const skip = (page - 1) * limit;

    const projectStage: any = {
      $project: {
        _id: 1,
        senderId: 1,
        senderRole: 1,
        receiverRole: 1,
        amount: 1,
        createdAt: 1,
        receiverInfo: {
          _id: 1,
          name: 1,
          email: 1,
          uid: 1,
          userId: 1,
          avatar: 1,
          level: 1,
        },
      },
    };

    const dataPipeline: any[] = [
      { $match: baseMatch },
      lookupStage,
      unwindStage,
      ...nameMatch,
      { $sort: { createdAt: -1 } },
      projectStage,
      { $skip: skip },
      { $limit: limit },
    ];

    const countPipeline: any[] = [
      { $match: baseMatch },
      lookupStage,
      unwindStage,
      ...nameMatch,
      { $count: "total" },
    ];

    const [data, countResult] = await Promise.all([
      this.Model.aggregate(dataPipeline).exec(),
      this.Model.aggregate(countPipeline).exec(),
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    return {
      pagination: {
        total,
        limit,
        page,
        totalPage: Math.ceil(total / limit),
      },
      data,
    };
  }
}
